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

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
