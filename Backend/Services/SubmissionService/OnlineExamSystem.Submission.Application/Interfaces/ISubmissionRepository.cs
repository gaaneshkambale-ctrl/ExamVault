using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Interfaces;

public interface ISubmissionRepository
{
    Task<ExamAttempt?> GetInProgressAttemptAsync(
        Guid examId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<int> CountAttemptsAsync(Guid examId, Guid userId, CancellationToken cancellationToken = default);

    Task AddAttemptAsync(ExamAttempt attempt, CancellationToken cancellationToken = default);

    Task<ExamAttempt?> GetAttemptByIdAsync(Guid attemptId, CancellationToken cancellationToken = default);

    Task<ExamAttempt?> GetMostRecentAttemptAsync(
        Guid examId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<AttemptAnswer?> GetAnswerAsync(
        Guid attemptId,
        Guid questionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AttemptAnswer>> GetAnswersByAttemptIdAsync(
        Guid attemptId,
        CancellationToken cancellationToken = default);

    Task AddAnswerAsync(AttemptAnswer answer, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
