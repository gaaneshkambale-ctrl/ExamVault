using OnlineExamSystem.Question.Domain.Entities;

namespace OnlineExamSystem.Question.Application.Interfaces;

public interface IQuestionRepository
{
    Task AddAsync(
        ExamQuestion question,
        IReadOnlyList<QuestionOption> options,
        CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
