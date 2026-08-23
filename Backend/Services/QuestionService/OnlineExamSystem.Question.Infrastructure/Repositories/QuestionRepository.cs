using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Question.Infrastructure.Persistence;

namespace OnlineExamSystem.Question.Infrastructure.Repositories;

public class QuestionRepository : IQuestionRepository
{
    private readonly QuestionDbContext _dbContext;

    public QuestionRepository(QuestionDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(
        ExamQuestion question,
        IReadOnlyList<QuestionOption> options,
        IReadOnlyList<QuestionParameter>? parameters = null,
        IReadOnlyList<QuestionTestCase>? testCases = null,
        IReadOnlyList<QuestionSqlTestCase>? sqlTestCases = null,
        CancellationToken cancellationToken = default)
    {
        await _dbContext.Questions.AddAsync(question, cancellationToken);
        await _dbContext.QuestionOptions.AddRangeAsync(options, cancellationToken);
        await _dbContext.QuestionParameters.AddRangeAsync(parameters ?? [], cancellationToken);
        await _dbContext.QuestionTestCases.AddRangeAsync(testCases ?? [], cancellationToken);
        await _dbContext.QuestionSqlTestCases.AddRangeAsync(sqlTestCases ?? [], cancellationToken);
    }

    public Task<ExamQuestion?> GetQuestionByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Questions.FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

    public async Task<IReadOnlyList<QuestionOption>> GetOptionsByQuestionIdAsync(
        Guid questionId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.QuestionOptions
            .Where(o => o.QuestionId == questionId)
            .OrderBy(o => o.DisplayOrder)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ExamQuestion>> GetQuestionsByExamIdAsync(
        Guid examId,
        Guid? sectionId = null,
        bool unassignedOnly = false,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Questions.Where(q => q.ExamId == examId);

        if (unassignedOnly)
        {
            query = query.Where(q => q.SectionId == null);
        }
        else if (sectionId is { } id)
        {
            query = query.Where(q => q.SectionId == id);
        }

        return await query.OrderByDescending(q => q.CreatedAtUtc).ToListAsync(cancellationToken);
    }

    public async Task BulkSetSectionIdAsync(
        Guid? sectionId,
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default)
    {
        await _dbContext.Questions
            .Where(q => questionIds.Contains(q.Id))
            .ExecuteUpdateAsync(setters => setters.SetProperty(q => q.SectionId, sectionId), cancellationToken);
    }

    public async Task UnassignAllQuestionsInSectionAsync(
        Guid sectionId,
        CancellationToken cancellationToken = default)
    {
        await _dbContext.Questions
            .Where(q => q.SectionId == sectionId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(q => q.SectionId, (Guid?)null), cancellationToken);
    }

    public async Task<IReadOnlyList<QuestionOption>> GetOptionsByQuestionIdsAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default) =>
        await _dbContext.QuestionOptions
            .Where(o => questionIds.Contains(o.QuestionId))
            .OrderBy(o => o.DisplayOrder)
            .ToListAsync(cancellationToken);

    public Task AddOptionsAsync(IReadOnlyList<QuestionOption> options, CancellationToken cancellationToken = default) =>
        _dbContext.QuestionOptions.AddRangeAsync(options, cancellationToken);

    public Task RemoveOptionsByQuestionIdAsync(Guid questionId, CancellationToken cancellationToken = default) =>
        _dbContext.QuestionOptions
            .Where(o => o.QuestionId == questionId)
            .ExecuteDeleteAsync(cancellationToken);

    public async Task<IReadOnlyList<QuestionParameter>> GetParametersByQuestionIdAsync(
        Guid questionId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.QuestionParameters
            .Where(p => p.QuestionId == questionId)
            .OrderBy(p => p.DisplayOrder)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<QuestionParameter>> GetParametersByQuestionIdsAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default) =>
        await _dbContext.QuestionParameters
            .Where(p => questionIds.Contains(p.QuestionId))
            .OrderBy(p => p.DisplayOrder)
            .ToListAsync(cancellationToken);

    public Task AddParametersAsync(
        IReadOnlyList<QuestionParameter> parameters,
        CancellationToken cancellationToken = default) =>
        _dbContext.QuestionParameters.AddRangeAsync(parameters, cancellationToken);

    public Task RemoveParametersByQuestionIdAsync(Guid questionId, CancellationToken cancellationToken = default) =>
        _dbContext.QuestionParameters
            .Where(p => p.QuestionId == questionId)
            .ExecuteDeleteAsync(cancellationToken);

    public async Task<IReadOnlyList<QuestionTestCase>> GetTestCasesByQuestionIdAsync(
        Guid questionId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.QuestionTestCases
            .Where(t => t.QuestionId == questionId)
            .OrderBy(t => t.DisplayOrder)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<QuestionTestCase>> GetTestCasesByQuestionIdsAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default) =>
        await _dbContext.QuestionTestCases
            .Where(t => questionIds.Contains(t.QuestionId))
            .OrderBy(t => t.DisplayOrder)
            .ToListAsync(cancellationToken);

    public Task AddTestCasesAsync(
        IReadOnlyList<QuestionTestCase> testCases,
        CancellationToken cancellationToken = default) =>
        _dbContext.QuestionTestCases.AddRangeAsync(testCases, cancellationToken);

    public Task RemoveTestCasesByQuestionIdAsync(Guid questionId, CancellationToken cancellationToken = default) =>
        _dbContext.QuestionTestCases
            .Where(t => t.QuestionId == questionId)
            .ExecuteDeleteAsync(cancellationToken);

    public async Task<IReadOnlyList<QuestionSqlTestCase>> GetSqlTestCasesByQuestionIdAsync(
        Guid questionId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.QuestionSqlTestCases
            .Where(t => t.QuestionId == questionId)
            .OrderBy(t => t.DisplayOrder)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<QuestionSqlTestCase>> GetSqlTestCasesByQuestionIdsAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default) =>
        await _dbContext.QuestionSqlTestCases
            .Where(t => questionIds.Contains(t.QuestionId))
            .OrderBy(t => t.DisplayOrder)
            .ToListAsync(cancellationToken);

    public Task AddSqlTestCasesAsync(
        IReadOnlyList<QuestionSqlTestCase> sqlTestCases,
        CancellationToken cancellationToken = default) =>
        _dbContext.QuestionSqlTestCases.AddRangeAsync(sqlTestCases, cancellationToken);

    public Task RemoveSqlTestCasesByQuestionIdAsync(Guid questionId, CancellationToken cancellationToken = default) =>
        _dbContext.QuestionSqlTestCases
            .Where(t => t.QuestionId == questionId)
            .ExecuteDeleteAsync(cancellationToken);

    public Task RemoveQuestionAsync(ExamQuestion question, CancellationToken cancellationToken = default)
    {
        _dbContext.Questions.Remove(question);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
