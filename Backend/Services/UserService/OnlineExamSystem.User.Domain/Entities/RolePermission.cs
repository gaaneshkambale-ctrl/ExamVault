using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.User.Domain.Entities;

public class RolePermission : TenantScopedEntity
{
    public string Role { get; set; } = string.Empty;
    public string PermissionKey { get; set; } = string.Empty;
}
