namespace OnlineExamSystem.Result.Application.Interfaces;

public record SubmissionAnswer(Guid QuestionId, Guid? SelectedOptionId);

public record SubmissionLookupResult(
    Guid AttemptId,
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
}
