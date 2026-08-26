using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Tests.Fakes;

public class FakeInternalUserLookupClient : IInternalUserLookupClient
{
    public Task<IReadOnlyList<UserLookupInfo>> GetUsersByIdsAsync(
        IReadOnlyList<Guid> userIds,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<UserLookupInfo>>(
            userIds.Select(id => new UserLookupInfo(id, $"{id}@example.com", "Test User")).ToList());
}
