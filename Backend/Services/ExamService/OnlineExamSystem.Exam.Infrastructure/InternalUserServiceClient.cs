using System.Net.Http.Json;
using System.Text.Json;
using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Infrastructure;

public class InternalUserServiceClient : IInternalUserLookupClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _httpClient;

    public InternalUserServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IReadOnlyList<UserLookupInfo>> GetUsersByIdsAsync(
        IReadOnlyList<Guid> userIds,
        CancellationToken cancellationToken = default)
    {
        if (userIds.Count == 0)
        {
            return [];
        }

        var query = string.Join('&', userIds.Select(id => $"ids={Uri.EscapeDataString(id.ToString())}"));
        var response = await _httpClient.GetAsync($"internal/users/by-ids?{query}", cancellationToken);
        response.EnsureSuccessStatusCode();

        var users = await response.Content.ReadFromJsonAsync<List<InternalUserApiResponse>>(
            JsonOptions,
            cancellationToken) ?? [];

        return users.Select(u => new UserLookupInfo(u.Id, u.Email, u.FullName)).ToList();
    }

    private sealed class InternalUserApiResponse
    {
        public Guid Id { get; init; }
        public string Email { get; init; } = string.Empty;
        public string FullName { get; init; } = string.Empty;
    }
}
