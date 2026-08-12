using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Domain.Entities;

namespace OnlineExamSystem.Question.Application.Tests.Fakes;

public class FakeQuestionRepository : IQuestionRepository
{
    private readonly List<ExamQuestion> _questions = [];
    private readonly List<QuestionOption> _options = [];

    public IReadOnlyList<ExamQuestion> Questions => _questions;
    public IReadOnlyList<QuestionOption> Options => _options;

    public Task AddAsync(
        ExamQuestion question,
        IReadOnlyList<QuestionOption> options,
        CancellationToken cancellationToken = default)
    {
        _questions.Add(question);
        _options.AddRange(options);
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
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ExamQuestion>>(
            _questions.Where(q => q.ExamId == examId).OrderByDescending(q => q.CreatedAtUtc).ToList());

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

    public Task RemoveQuestionAsync(ExamQuestion question, CancellationToken cancellationToken = default)
    {
        _questions.Remove(question);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
