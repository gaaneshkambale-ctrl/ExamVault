using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Tests.Fakes;

public class FakeUserDirectoryClient : IUserDirectoryClient
{
    private readonly IReadOnlyList<UserDirectoryEntry> _users;

    public FakeUserDirectoryClient(IReadOnlyList<UserDirectoryEntry> users)
    {
        _users = users;
    }

    public Task<IReadOnlyList<UserDirectoryEntry>> GetAllUsersAsync(
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_users);

    public Task<IReadOnlyList<UserDirectoryEntry>> GetStudentsAsync(
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<UserDirectoryEntry>>(
            _users.Where(u => string.Equals(u.Role, "Student", StringComparison.OrdinalIgnoreCase)).ToList());
}
