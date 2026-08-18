namespace OnlineExamSystem.User.Application.Users.GetMySessions;

public record MySessionItem(
    Guid Id,
    string DeviceLabel,
    DateTime IssuedAtUtc,
    DateTime ExpiresAtUtc,
    DateTime? RevokedAtUtc,
    string Status,
    bool IsCurrent);
