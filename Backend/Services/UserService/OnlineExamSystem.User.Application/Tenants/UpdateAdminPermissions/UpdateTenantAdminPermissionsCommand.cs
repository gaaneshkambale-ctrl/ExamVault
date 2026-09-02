namespace OnlineExamSystem.User.Application.Tenants.UpdateAdminPermissions;

public record UpdateTenantAdminPermissionsCommand(Guid TenantId, IReadOnlyList<string> Permissions);
