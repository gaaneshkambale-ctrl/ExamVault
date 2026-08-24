namespace OnlineExamSystem.Shared.Contracts.Requests.User;

// PlanId is optional - omitted defaults to the seeded "Full Access" plan
// (CreateTenantHandler's own fallback), same as every pre-subscription-plans
// tenant already has.
public record CreateTenantRequest(string Name, string Slug, Guid? PlanId = null);
