using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Domain.Entities;

namespace OnlineExamSystem.Question.Application.Tests.Fakes;

public class FakeQuestionRepository : IQuestionRepository
{
    private readonly List<ExamQuestion> _questions = [];
    private readonly List<QuestionOption> _options = [];
    private readonly List<QuestionParameter> _parameters = [];
    private readonly List<QuestionTestCase> _testCases = [];
    private readonly List<QuestionSqlTestCase> _sqlTestCases = [];

    public IReadOnlyList<ExamQuestion> Questions => _questions;
    public IReadOnlyList<QuestionOption> Options => _options;
    public IReadOnlyList<QuestionParameter> Parameters => _parameters;
    public IReadOnlyList<QuestionTestCase> TestCases => _testCases;
    public IReadOnlyList<QuestionSqlTestCase> SqlTestCases => _sqlTestCases;

    public Task AddAsync(
        ExamQuestion question,
        IReadOnlyList<QuestionOption> options,
        IReadOnlyList<QuestionParameter>? parameters = null,
        IReadOnlyList<QuestionTestCase>? testCases = null,
        IReadOnlyList<QuestionSqlTestCase>? sqlTestCases = null,
        CancellationToken cancellationToken = default)
    {
        _questions.Add(question);
        _options.AddRange(options);
        _parameters.AddRange(parameters ?? []);
        _testCases.AddRange(testCases ?? []);
        _sqlTestCases.AddRange(sqlTestCases ?? []);
        return Task.CompletedTask;
    }

    public Task<ExamQuestion?> GetQuestionByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(_questions.FirstOrDefault(q => q.Id == id));

    public Task<IReadOnlyList<QuestionOption>> GetOptionsByQuestionIdAsync(
        Guid questionId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<QuestionOption>>(
            _options.Where(o => o.QuestionId == questionId).OrderBy(o => o.DisplayOrder).ToList());

    public Task<IReadOnlyList<ExamQuestion>> GetQuestionsByExamIdAsync(
        Guid examId,
        Guid? sectionId = null,
        bool unassignedOnly = false,
        CancellationToken cancellationToken = default)
    {
        var query = _questions.Where(q => q.ExamId == examId);
        if (unassignedOnly)
        {
            query = query.Where(q => q.SectionId == null);
        }
        else if (sectionId is { } id)
        {
            query = query.Where(q => q.SectionId == id);
        }

        return Task.FromResult<IReadOnlyList<ExamQuestion>>(
            query.OrderByDescending(q => q.CreatedAtUtc).ToList());
    }

    public Task BulkSetSectionIdAsync(
        Guid? sectionId,
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default)
    {
        foreach (var question in _questions.Where(q => questionIds.Contains(q.Id)))
        {
            question.SectionId = sectionId;
        }

        return Task.CompletedTask;
    }

    public Task UnassignAllQuestionsInSectionAsync(Guid sectionId, CancellationToken cancellationToken = default)
    {
        foreach (var question in _questions.Where(q => q.SectionId == sectionId))
        {
            question.SectionId = null;
        }

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<QuestionOption>> GetOptionsByQuestionIdsAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<QuestionOption>>(
            _options.Where(o => questionIds.Contains(o.QuestionId)).OrderBy(o => o.DisplayOrder).ToList());

    public Task AddOptionsAsync(IReadOnlyList<QuestionOption> options, CancellationToken cancellationToken = default)
    {
        _options.AddRange(options);
        return Task.CompletedTask;
    }

    public Task RemoveOptionsByQuestionIdAsync(Guid questionId, CancellationToken cancellationToken = default)
    {
        _options.RemoveAll(o => o.QuestionId == questionId);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<QuestionParameter>> GetParametersByQuestionIdAsync(
        Guid questionId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<QuestionParameter>>(
            _parameters.Where(p => p.QuestionId == questionId).OrderBy(p => p.DisplayOrder).ToList());

    public Task<IReadOnlyList<QuestionParameter>> GetParametersByQuestionIdsAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<QuestionParameter>>(
            _parameters.Where(p => questionIds.Contains(p.QuestionId)).OrderBy(p => p.DisplayOrder).ToList());

    public Task AddParametersAsync(
        IReadOnlyList<QuestionParameter> parameters,
        CancellationToken cancellationToken = default)
    {
        _parameters.AddRange(parameters);
        return Task.CompletedTask;
    }

    public Task RemoveParametersByQuestionIdAsync(Guid questionId, CancellationToken cancellationToken = default)
    {
        _parameters.RemoveAll(p => p.QuestionId == questionId);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<QuestionTestCase>> GetTestCasesByQuestionIdAsync(
        Guid questionId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<QuestionTestCase>>(
            _testCases.Where(t => t.QuestionId == questionId).OrderBy(t => t.DisplayOrder).ToList());

    public Task<IReadOnlyList<QuestionTestCase>> GetTestCasesByQuestionIdsAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<QuestionTestCase>>(
            _testCases.Where(t => questionIds.Contains(t.QuestionId)).OrderBy(t => t.DisplayOrder).ToList());

    public Task AddTestCasesAsync(
        IReadOnlyList<QuestionTestCase> testCases,
        CancellationToken cancellationToken = default)
    {
        _testCases.AddRange(testCases);
        return Task.CompletedTask;
    }

    public Task RemoveTestCasesByQuestionIdAsync(Guid questionId, CancellationToken cancellationToken = default)
    {
        _testCases.RemoveAll(t => t.QuestionId == questionId);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<QuestionSqlTestCase>> GetSqlTestCasesByQuestionIdAsync(
        Guid questionId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<QuestionSqlTestCase>>(
            _sqlTestCases.Where(t => t.QuestionId == questionId).OrderBy(t => t.DisplayOrder).ToList());

    public Task<IReadOnlyList<QuestionSqlTestCase>> GetSqlTestCasesByQuestionIdsAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<QuestionSqlTestCase>>(
            _sqlTestCases.Where(t => questionIds.Contains(t.QuestionId)).OrderBy(t => t.DisplayOrder).ToList());

    public Task AddSqlTestCasesAsync(
        IReadOnlyList<QuestionSqlTestCase> sqlTestCases,
        CancellationToken cancellationToken = default)
    {
        _sqlTestCases.AddRange(sqlTestCases);
        return Task.CompletedTask;
    }

    public Task RemoveSqlTestCasesByQuestionIdAsync(Guid questionId, CancellationToken cancellationToken = default)
    {
        _sqlTestCases.RemoveAll(t => t.QuestionId == questionId);
        return Task.CompletedTask;
    }

    public Task RemoveQuestionAsync(ExamQuestion question, CancellationToken cancellationToken = default)
    {
        _questions.Remove(question);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
