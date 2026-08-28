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

    Task<IReadOnlyList<ExamAttempt>> GetSubmittedAttemptsByExamIdAsync(
        Guid examId,
        CancellationToken cancellationToken = default);

    // Unlike GetSubmittedAttemptsByExamIdAsync (Reports - completed attempts
    // only), this returns every attempt regardless of status, for Live
    // Monitoring's Active Exams screen which needs InProgress attempts too.
    Task<IReadOnlyList<ExamAttempt>> GetAllAttemptsByExamIdAsync(
        Guid examId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ExamAttempt>> GetAttemptsByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<ILookup<Guid, AttemptAnswer>> GetAnswersByAttemptIdsAsync(
        IReadOnlyList<Guid> attemptIds,
        CancellationToken cancellationToken = default);

    // Atomic insert-or-update, keyed on the unique (AttemptId, QuestionId)
    // index - two near-simultaneous saves for the same question (autosave
    // racing "Save & Next") must never lose one to an unhandled unique-
    // constraint violation.
    Task<AttemptAnswer> UpsertAnswerAsync(
        Guid attemptId,
        Guid questionId,
        Guid? selectedOptionId,
        string? selectedOptionIdsJson,
        bool isMarkedForReview,
        string? answerText,
        DateTime answeredAtUtc,
        CancellationToken cancellationToken = default);

    Task<AttemptSectionState?> GetSectionStateAsync(
        Guid attemptId,
        Guid sectionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AttemptSectionState>> GetSectionStatesByAttemptIdAsync(
        Guid attemptId,
        CancellationToken cancellationToken = default);

    Task AddSectionStateAsync(AttemptSectionState state, CancellationToken cancellationToken = default);

    Task AddViolationEventAsync(ViolationEvent violationEvent, CancellationToken cancellationToken = default);

    Task<ViolationEvent?> GetViolationEventByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ViolationEvent>> GetViolationEventsByAttemptIdsAsync(
        IReadOnlyList<Guid> attemptIds,
        CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
