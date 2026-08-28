namespace OnlineExamSystem.User.Application.Tenants.Create;

public record CreateTenantCommand(
    string Name,
    string Slug,
    Guid? PlanId = null,
    bool IsTrial = false,
    DateTime? TrialEndsAtUtc = null);
