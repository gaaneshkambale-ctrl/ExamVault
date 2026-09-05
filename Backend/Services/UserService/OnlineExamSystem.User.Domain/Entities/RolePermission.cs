using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.User.Domain.Entities;

public class RolePermission : TenantScopedEntity
{
    public string Role { get; set; } = string.Empty;
    public string PermissionKey { get; set; } = string.Empty;
    public DateTime UpdatedAtUtc { get; set; }

    // Who last changed this role's permissions - real accountability for a
    // privilege-control table, not previously tracked (only the timestamp
    // was). Null for rows never touched since this field existed.
    public Guid? UpdatedByUserId { get; set; }
}
