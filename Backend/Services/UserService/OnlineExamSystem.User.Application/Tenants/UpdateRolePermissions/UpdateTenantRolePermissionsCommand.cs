namespace OnlineExamSystem.User.Application.Tenants.UpdateRolePermissions;

public record UpdateTenantRolePermissionsCommand(Guid TenantId, string Role, IReadOnlyList<string> Permissions, Guid UpdatedByUserId);
