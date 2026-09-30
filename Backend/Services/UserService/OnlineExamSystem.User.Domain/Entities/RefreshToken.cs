using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.User.Domain.Entities;

public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? DeviceLabel { get; set; }
    public string? IpAddress { get; set; }

    // When the login that started this session happened - copied onto every
    // rotated refresh token (RefreshTokenHandler), so the session's age is
    // known no matter how often it refreshes. Refresh is refused once it is
    // older than RefreshTokenHandler.MaxSessionAge, forcing a fresh login.
    public DateTime SessionStartedAtUtc { get; set; } = DateTime.UtcNow;

    public bool IsActive => RevokedAtUtc is null && ExpiresAtUtc > DateTime.UtcNow;
}
