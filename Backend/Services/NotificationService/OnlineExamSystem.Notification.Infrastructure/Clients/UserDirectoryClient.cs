using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Infrastructure.Clients;

public class UserDirectoryClient : IUserDirectoryClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _httpClient;

    public UserDirectoryClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IReadOnlyList<UserDirectoryEntry>> GetAllUsersAsync(
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "api/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var users = await response.Content.ReadFromJsonAsync<List<UserListItemApiResponse>>(
            JsonOptions,
            cancellationToken) ?? [];

        return users
            .Select(u => new UserDirectoryEntry(u.Id, u.Email, u.FullName, u.Role))
            .ToList();
    }

    private sealed class UserListItemApiResponse
    {
        public Guid Id { get; init; }
        public string FullName { get; init; } = string.Empty;
        public string Email { get; init; } = string.Empty;
        public string Role { get; init; } = string.Empty;
    }
}
