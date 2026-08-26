using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Infrastructure;

// Metered.ca (https://www.metered.ca/docs/) - a hosted WebRTC video/recording
// platform. Rooms and per-user join tokens are created server-side only
// (the Secret Key must never reach the student's browser); the client SDK
// then joins using just the room URL + token this service hands back.
// Every call here is best-effort: a Metered outage must never block a
// student from starting or continuing their exam.
public class MeteredVideoRecordingService : IVideoRecordingService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _appDomain;
    private readonly ILogger<MeteredVideoRecordingService> _logger;

    public MeteredVideoRecordingService(HttpClient httpClient, string apiKey, string appDomain, ILogger<MeteredVideoRecordingService> logger)
    {
        _httpClient = httpClient;
        _apiKey = apiKey;
        _appDomain = appDomain;
        _logger = logger;
    }

    public async Task<bool> EnsureRoomExistsAsync(string roomName, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.PostAsJsonAsync(
                $"api/v1/room?secretKey={_apiKey}",
                new { roomName, privacy = "private", recordRoom = true },
                cancellationToken);

            // A "room already exists" conflict is expected on every re-join
            // after the first - not a real failure, the room the caller
            // wanted is right there either way.
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogInformation(
                    "Metered create-room for {RoomName} returned {Status} (may already exist).",
                    roomName,
                    response.StatusCode);
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Metered create-room threw for room {RoomName}.", roomName);
            return false;
        }
    }

    public async Task<string?> CreateJoinTokenAsync(
        string roomName,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.PostAsJsonAsync(
                $"api/v1/token?secretKey={_apiKey}",
                new { roomName, externalUserId = userId.ToString() },
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Metered create-token for room {RoomName} failed: {Status}.",
                    roomName,
                    response.StatusCode);
                return null;
            }

            var body = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: cancellationToken);
            return body?.Token;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Metered create-token threw for room {RoomName}.", roomName);
            return null;
        }
    }

    public string GetRoomUrl(string roomName) => $"{_appDomain}/{roomName}";

    private sealed class TokenResponse
    {
        public string? Token { get; init; }
    }
}
