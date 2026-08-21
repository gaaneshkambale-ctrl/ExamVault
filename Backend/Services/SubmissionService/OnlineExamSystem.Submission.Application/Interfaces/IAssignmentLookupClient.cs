namespace OnlineExamSystem.Submission.Application.Interfaces;

public record AssignmentLookupResult(
    Guid Id,
    Guid ExamId,
    DateTime StartAtUtc,
    DateTime EndAtUtc,
    int MaxAttempts,
    bool EnableProctoring = false);

public interface IAssignmentLookupClient
{
    /// <summary>The calling user's own assignment for this exam, or null if they have
    /// none. Scoped to "mine" via the bearer token - never returns another user's
    /// assignment.</summary>
    Task<AssignmentLookupResult?> GetMyAssignmentAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);
}
