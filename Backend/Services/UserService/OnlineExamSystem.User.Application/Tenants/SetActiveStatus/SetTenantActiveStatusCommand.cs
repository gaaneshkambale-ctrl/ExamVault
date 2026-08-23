namespace OnlineExamSystem.User.Application.Tenants.SetActiveStatus;

public record SetTenantActiveStatusCommand(Guid TenantId, bool IsActive);
