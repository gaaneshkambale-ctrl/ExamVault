using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Tests.Fakes;

public class FakeUserLookupClient : IUserLookupClient
{
    private readonly GroupMembersResult? _groupResult;
    private readonly IReadOnlyList<Guid> _allStudentUserIds;
    private readonly IReadOnlyList<StudentAcademicScope> _academicScopes;
    private readonly IReadOnlySet<Guid> _foreignUserIds;

    public FakeUserLookupClient(
        GroupMembersResult? result,
        IReadOnlyList<Guid>? allStudentUserIds = null,
        IReadOnlyList<StudentAcademicScope>? academicScopes = null,
        IReadOnlySet<Guid>? foreignUserIds = null)
    {
        _groupResult = result;
        _allStudentUserIds = allStudentUserIds ?? Array.Empty<Guid>();
        _academicScopes = academicScopes ?? Array.Empty<StudentAcademicScope>();
        _foreignUserIds = foreignUserIds ?? new HashSet<Guid>();
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

    // Every id counts as a Student of the caller's tenant unless listed in
    // foreignUserIds (another tenant's user, or not a Student at all).
    public Task<IReadOnlyList<Guid>> GetTenantStudentIdsAmongAsync(
        IReadOnlyList<Guid> userIds,
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Guid>>(userIds.Where(id => !_foreignUserIds.Contains(id)).ToList());

    public Task<IReadOnlyList<StudentAcademicScope>> GetStudentAcademicScopesAsync(
        IReadOnlyList<Guid> userIds,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        var idSet = userIds.ToHashSet();
        return Task.FromResult<IReadOnlyList<StudentAcademicScope>>(
            _academicScopes.Where(s => idSet.Contains(s.UserId)).ToList());
    }
}
