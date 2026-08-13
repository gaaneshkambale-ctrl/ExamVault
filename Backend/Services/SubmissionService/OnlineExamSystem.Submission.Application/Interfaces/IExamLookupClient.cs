namespace OnlineExamSystem.Submission.Application.Interfaces;

public record ExamLookupResult(Guid Id, string Status, int MaxAttempts, DateTime? StartAtUtc, DateTime? EndAtUtc);

public interface IExamLookupClient
{
    Task<ExamLookupResult?> GetExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);
}
