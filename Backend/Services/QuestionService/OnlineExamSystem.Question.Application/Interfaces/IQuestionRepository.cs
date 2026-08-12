using OnlineExamSystem.Question.Domain.Entities;

namespace OnlineExamSystem.Question.Application.Interfaces;

public interface IQuestionRepository
{
    Task AddAsync(
        ExamQuestion question,
        IReadOnlyList<QuestionOption> options,
        CancellationToken cancellationToken = default);

    Task<ExamQuestion?> GetQuestionByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<QuestionOption>> GetOptionsByQuestionIdAsync(
        Guid questionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ExamQuestion>> GetQuestionsByExamIdAsync(
        Guid examId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<QuestionOption>> GetOptionsByQuestionIdsAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
