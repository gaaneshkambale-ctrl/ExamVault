namespace OnlineExamSystem.Exam.Application.Interfaces;

public record GroupMembersResult(Guid GroupId, IReadOnlyList<Guid> UserIds);

public record UserLookupInfo(Guid Id, string Email, string FullName);

// Only the four well-known keys CreateAssignmentHandler's eligibility
// check compares (program/department/semester/division) - not the
// student's full academicFields dictionary, since that's org-type-
// specific and this client lives in ExamService, not UserService.
public record StudentAcademicScope(Guid UserId, IReadOnlyDictionary<string, string> AcademicFields);

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

    // Backs the eligibility check in CreateAssignmentHandler. Reuses
    // GET /api/users/students - the same endpoint GetAllStudentUserIdsAsync
    // already calls with the caller's own forwarded bearer token - since it
    // already returns each student's AcademicFields for Student Reports'
    // export; a student not present in the response (eg. not a Student
    // role) simply has no entry in the result.
    Task<IReadOnlyList<StudentAcademicScope>> GetStudentAcademicScopesAsync(
        IReadOnlyList<Guid> userIds,
        string bearerToken,
        CancellationToken cancellationToken = default);
}
