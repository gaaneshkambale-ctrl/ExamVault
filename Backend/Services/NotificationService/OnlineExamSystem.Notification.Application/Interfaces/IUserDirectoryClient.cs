namespace OnlineExamSystem.Notification.Application.Interfaces;

public record UserDirectoryEntry(Guid Id, string Email, string FullName, string Role);

public interface IUserDirectoryClient
{
    Task<IReadOnlyList<UserDirectoryEntry>> GetAllUsersAsync(
        string bearerToken,
        CancellationToken cancellationToken = default);

    /// <summary>Students only, via the narrower GET /api/users/students - the path an
    /// Instructor caller must use instead of GetAllUsersAsync, since GET /api/users
    /// itself requires "Users - View" (a permission Instructor never has).</summary>
    Task<IReadOnlyList<UserDirectoryEntry>> GetStudentsAsync(
        string bearerToken,
        CancellationToken cancellationToken = default);
}
