namespace OnlineExamSystem.Exam.Application.Interfaces;

public record GroupMembersResult(Guid GroupId, IReadOnlyList<Guid> UserIds);

public interface IUserLookupClient
{
    Task<GroupMembersResult?> GetGroupMembersAsync(
        Guid groupId,
        string bearerToken,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Guid>> GetAllStudentUserIdsAsync(
        string bearerToken,
        CancellationToken cancellationToken = default);
}
