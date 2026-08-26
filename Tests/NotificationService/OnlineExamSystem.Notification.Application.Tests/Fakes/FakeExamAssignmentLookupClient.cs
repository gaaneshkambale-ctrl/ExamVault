using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Tests.Fakes;

public class FakeExamAssignmentLookupClient : IExamAssignmentLookupClient
{
    private readonly IReadOnlyList<Guid> _targetUserIds;

    public FakeExamAssignmentLookupClient(IReadOnlyList<Guid> targetUserIds)
    {
        _targetUserIds = targetUserIds;
    }

    public Task<IReadOnlyList<Guid>> GetTargetUserIdsForExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_targetUserIds);
}
