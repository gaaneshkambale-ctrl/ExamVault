namespace OnlineExamSystem.User.Application.Tenants.ResetAdminPassword;

public record ResetTenantAdminPasswordCommand(Guid TenantId, Guid AdminUserId);
