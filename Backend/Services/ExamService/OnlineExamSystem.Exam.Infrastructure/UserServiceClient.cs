using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Infrastructure;

public class UserServiceClient : IUserLookupClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _httpClient;

    public UserServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<GroupMembersResult?> GetGroupMembersAsync(
        Guid groupId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/users/groups/{groupId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        var group = await response.Content.ReadFromJsonAsync<GroupDetailApiResponse>(JsonOptions, cancellationToken)
            ?? throw new InvalidOperationException("Empty response from User Service.");

        return new GroupMembersResult(group.Id, group.MemberUserIds);
    }

    public async Task<IReadOnlyList<Guid>> GetAllStudentUserIdsAsync(
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        var users = await GetAllUsersAsync(bearerToken, cancellationToken);

        return users
            .Where(u => string.Equals(u.Role, "Student", StringComparison.OrdinalIgnoreCase))
            .Select(u => u.Id)
            .ToList();
    }

    public async Task<IReadOnlyList<UserLookupInfo>> GetUsersByIdsAsync(
        IReadOnlyList<Guid> userIds,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        var users = await GetAllUsersAsync(bearerToken, cancellationToken);
        var idSet = userIds.ToHashSet();

        return users
            .Where(u => idSet.Contains(u.Id))
            .Select(u => new UserLookupInfo(u.Id, u.Email, u.FullName))
            .ToList();
    }

    private async Task<List<UserListItemApiResponse>> GetAllUsersAsync(
        string bearerToken,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<UserListItemApiResponse>>(
            JsonOptions,
            cancellationToken) ?? [];
    }

    private sealed class GroupDetailApiResponse
    {
        public Guid Id { get; init; }
        public string Name { get; init; } = string.Empty;
        public DateTime CreatedAtUtc { get; init; }
        public List<Guid> MemberUserIds { get; init; } = [];
    }

    private sealed class UserListItemApiResponse
    {
        public Guid Id { get; init; }
        public string FullName { get; init; } = string.Empty;
        public string Email { get; init; } = string.Empty;
        public string Role { get; init; } = string.Empty;
    }
}
