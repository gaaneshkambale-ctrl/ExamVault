namespace OnlineExamSystem.User.Application.Tenants.SetTrial;

public record SetTenantTrialCommand(Guid TenantId, bool IsTrial, DateTime? TrialEndsAtUtc);
