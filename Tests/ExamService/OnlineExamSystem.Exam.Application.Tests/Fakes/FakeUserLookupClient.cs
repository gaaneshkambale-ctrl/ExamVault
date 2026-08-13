using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Tests.Fakes;

public class FakeUserLookupClient : IUserLookupClient
{
    private readonly GroupMembersResult? _groupResult;
    private readonly IReadOnlyList<Guid> _allStudentUserIds;

    public FakeUserLookupClient(GroupMembersResult? result, IReadOnlyList<Guid>? allStudentUserIds = null)
    {
        _groupResult = result;
        _allStudentUserIds = allStudentUserIds ?? Array.Empty<Guid>();
    }

    public Task<GroupMembersResult?> GetGroupMembersAsync(
        Guid groupId,
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_groupResult);

    public Task<IReadOnlyList<Guid>> GetAllStudentUserIdsAsync(
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_allStudentUserIds);

    public Task<IReadOnlyList<UserLookupInfo>> GetUsersByIdsAsync(
        IReadOnlyList<Guid> userIds,
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<UserLookupInfo>>(
            userIds.Select(id => new UserLookupInfo(id, $"{id}@example.com", "Test User")).ToList());
}
