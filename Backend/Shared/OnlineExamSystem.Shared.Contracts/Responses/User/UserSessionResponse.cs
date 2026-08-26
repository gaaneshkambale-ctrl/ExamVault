namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record UserSessionResponse(
    Guid Id,
    DateTime IssuedAtUtc,
    DateTime ExpiresAtUtc,
    DateTime? RevokedAtUtc,
    string Status,
    string DeviceLabel = "Unknown device",
    bool IsCurrent = false,
    string? IpAddress = null);
