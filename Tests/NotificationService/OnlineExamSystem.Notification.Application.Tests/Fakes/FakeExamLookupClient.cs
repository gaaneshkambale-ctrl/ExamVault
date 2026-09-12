using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Tests.Fakes;

public class FakeExamLookupClient : IExamLookupClient
{
    private readonly ExamLookupResult? _result;
    private readonly IReadOnlyList<Guid> _ownedExamIds;

    public FakeExamLookupClient(ExamLookupResult? result, IReadOnlyList<Guid>? ownedExamIds = null)
    {
        _result = result;
        _ownedExamIds = ownedExamIds ?? [];
    }

    public Task<ExamLookupResult?> GetExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_result);

    public Task<IReadOnlyList<Guid>> GetOwnedExamIdsAsync(
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_ownedExamIds);
}
