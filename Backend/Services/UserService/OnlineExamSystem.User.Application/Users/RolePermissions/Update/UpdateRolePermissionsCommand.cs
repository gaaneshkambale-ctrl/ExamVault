namespace OnlineExamSystem.User.Application.Users.RolePermissions.Update;

public record UpdateRolePermissionsCommand(Guid TenantId, string Role, IReadOnlyList<string> Permissions, Guid UpdatedByUserId);
