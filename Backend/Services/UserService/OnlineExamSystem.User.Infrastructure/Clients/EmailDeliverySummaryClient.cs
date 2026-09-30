using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Infrastructure.Clients;

public class EmailDeliverySummaryClient : IEmailDeliverySummaryClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly EmailDeliverySummary FailOpenSummary = new(0, 0, 0);

    private readonly HttpClient _httpClient;
    private readonly ILogger<EmailDeliverySummaryClient> _logger;

    public EmailDeliverySummaryClient(HttpClient httpClient, ILogger<EmailDeliverySummaryClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    // Fails open to zero counts, same reasoning as every other cross-service
    // client in this codebase - a NotificationService outage must not break
    // the Email Settings page, it should just under-report until it recovers.
    public async Task<EmailDeliverySummary> GetTodaySummaryAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("internal/email-delivery/summary", cancellationToken);
            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadFromJsonAsync<EmailDeliverySummaryApiResponse>(JsonOptions, cancellationToken);
            return body is null ? FailOpenSummary : new EmailDeliverySummary(body.SentToday, body.DeliveredToday, body.FailedToday);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Couldn't reach NotificationService for its email delivery summary - reporting 0.");
            return FailOpenSummary;
        }
    }

    private sealed class EmailDeliverySummaryApiResponse
    {
        public int SentToday { get; init; }
        public int DeliveredToday { get; init; }
        public int FailedToday { get; init; }
    }
}
