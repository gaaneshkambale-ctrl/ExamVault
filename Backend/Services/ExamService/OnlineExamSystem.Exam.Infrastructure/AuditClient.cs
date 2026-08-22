using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Shared.Contracts.Requests.Notification;

namespace OnlineExamSystem.Exam.Infrastructure;

public class AuditClient : IAuditClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AuditClient> _logger;

    public AuditClient(HttpClient httpClient, ILogger<AuditClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task RecordAsync(
        string module,
        string activity,
        string? details,
        string? entityId,
        Guid? userId,
        string? userName,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new RecordAuditLogRequest(module, activity, details, entityId, userId, userName, ipAddress);
            using var response = await _httpClient.PostAsJsonAsync("api/audit-logs", request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Audit log write failed with status {StatusCode} for activity {Activity}.",
                    response.StatusCode,
                    activity);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Audit log write threw for activity {Activity}.", activity);
        }
    }
}
