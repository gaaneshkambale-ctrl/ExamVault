namespace OnlineExamSystem.Notification.Application.Interfaces;

public interface IExamAssignmentLookupClient
{
    Task<IReadOnlyList<Guid>> GetTargetUserIdsForExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);
}
