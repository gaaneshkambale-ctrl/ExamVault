namespace OnlineExamSystem.Result.Application.Interfaces;

public record SubmissionAnswer(Guid QuestionId, Guid? SelectedOptionId);

public record SubmissionLookupResult(
    Guid AttemptId,
    Guid UserId,
    Guid ExamId,
    string Status,
    DateTime? SubmittedAtUtc,
    IReadOnlyList<SubmissionAnswer> Answers);

public interface ISubmissionLookupClient
{
    Task<SubmissionLookupResult?> GetMyAttemptAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);

    /// <summary>Every Submitted/AutoSubmitted attempt for the exam, across all
    /// users - admin-only data, used by the exam report / global results
    /// views.</summary>
    Task<IReadOnlyList<SubmissionLookupResult>> GetAttemptsByExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);
}
