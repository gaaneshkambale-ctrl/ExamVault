namespace OnlineExamSystem.User.Application.Tenants.AssignPlan;

public record AssignPlanToTenantCommand(Guid TenantId, Guid PlanId);
