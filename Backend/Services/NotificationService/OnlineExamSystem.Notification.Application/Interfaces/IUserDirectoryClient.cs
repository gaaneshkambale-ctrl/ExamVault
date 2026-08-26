namespace OnlineExamSystem.Notification.Application.Interfaces;

public record UserDirectoryEntry(Guid Id, string Email, string FullName, string Role);

public interface IUserDirectoryClient
{
    Task<IReadOnlyList<UserDirectoryEntry>> GetAllUsersAsync(
        string bearerToken,
        CancellationToken cancellationToken = default);
}
