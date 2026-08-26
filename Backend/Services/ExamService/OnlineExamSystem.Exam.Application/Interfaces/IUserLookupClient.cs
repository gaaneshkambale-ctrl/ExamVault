namespace OnlineExamSystem.Exam.Application.Interfaces;

public record GroupMembersResult(Guid GroupId, IReadOnlyList<Guid> UserIds);

public record UserLookupInfo(Guid Id, string Email, string FullName);

public interface IUserLookupClient
{
    Task<GroupMembersResult?> GetGroupMembersAsync(
        Guid groupId,
        string bearerToken,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Guid>> GetAllStudentUserIdsAsync(
        string bearerToken,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<UserLookupInfo>> GetUsersByIdsAsync(
        IReadOnlyList<Guid> userIds,
        string bearerToken,
        CancellationToken cancellationToken = default);
}
