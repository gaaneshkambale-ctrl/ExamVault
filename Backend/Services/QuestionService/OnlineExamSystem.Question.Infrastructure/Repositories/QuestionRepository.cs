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
        CancellationToken cancellationToken = default)
    {
        await _dbContext.Questions.AddAsync(question, cancellationToken);
        await _dbContext.QuestionOptions.AddRangeAsync(options, cancellationToken);
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

    public Task RemoveQuestionAsync(ExamQuestion question, CancellationToken cancellationToken = default)
    {
        _dbContext.Questions.Remove(question);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
