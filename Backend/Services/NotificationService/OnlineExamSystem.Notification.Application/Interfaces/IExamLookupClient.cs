namespace OnlineExamSystem.Notification.Application.Interfaces;

public record ExamLookupResult(Guid Id, Guid? CreatedByUserId);

public interface IExamLookupClient
{
    Task<ExamLookupResult?> GetExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);

    /// <summary>Every exam id the caller owns, via GET /api/exams - already OwnedOnly-
    /// scoped server-side for an Instructor caller, so this needs no new ExamService
    /// endpoint. Used to filter a LIST of notification batches down to the caller's
    /// own exams (a set-based ownership check, unlike GetExamAsync's single-item
    /// one).</summary>
    Task<IReadOnlyList<Guid>> GetOwnedExamIdsAsync(
        string bearerToken,
        CancellationToken cancellationToken = default);
}
