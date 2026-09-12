using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.Ai.Application.Interfaces;

namespace OnlineExamSystem.Ai.Infrastructure;

public class PermissionVersionClient : IPermissionVersionClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PermissionVersionClient> _logger;

    public PermissionVersionClient(HttpClient httpClient, ILogger<PermissionVersionClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<int?> GetCurrentVersionAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.GetAsync(
                $"internal/tenants/{tenantId}/permission-version", cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var body = await response.Content.ReadFromJsonAsync<PermissionVersionApiResponse>(cancellationToken);
            return body?.Version;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(
                ex, "Failed to reach User Service for tenant {TenantId}'s permission version - failing open.", tenantId);
            return null;
        }
    }

    private sealed class PermissionVersionApiResponse
    {
        public int Version { get; init; }
    }
}
