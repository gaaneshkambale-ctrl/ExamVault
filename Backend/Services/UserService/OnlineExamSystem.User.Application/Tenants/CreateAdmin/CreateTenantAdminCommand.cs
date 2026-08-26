namespace OnlineExamSystem.User.Application.Tenants.CreateAdmin;

public record CreateTenantAdminCommand(Guid TenantId, string FullName, string Email);
