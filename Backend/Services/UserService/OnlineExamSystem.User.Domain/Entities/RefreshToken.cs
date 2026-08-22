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

    public bool IsActive => RevokedAtUtc is null && ExpiresAtUtc > DateTime.UtcNow;
}
