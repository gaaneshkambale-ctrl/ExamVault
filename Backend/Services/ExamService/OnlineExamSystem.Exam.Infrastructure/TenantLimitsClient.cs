using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Infrastructure;

public class TenantLimitsClient : ITenantLimitsClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _httpClient;

    public TenantLimitsClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<TenantLimits?> GetLimitsAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetAsync($"internal/tenants/{tenantId}/limits", cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
        response.EnsureSuccessStatusCode();

        var limits = await response.Content.ReadFromJsonAsync<InternalTenantLimitsResponse>(JsonOptions, cancellationToken);
        return limits is null ? null : new TenantLimits(limits.MaxUsers, limits.MaxExams, limits.MaxStudents);
    }

    private sealed class InternalTenantLimitsResponse
    {
        public int? MaxUsers { get; init; }
        public int? MaxExams { get; init; }
        public int? MaxStudents { get; init; }
    }
}
