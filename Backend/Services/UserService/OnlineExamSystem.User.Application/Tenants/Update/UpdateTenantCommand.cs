namespace OnlineExamSystem.User.Application.Tenants.Update;

public record UpdateTenantCommand(Guid TenantId, string Name, string Slug);
