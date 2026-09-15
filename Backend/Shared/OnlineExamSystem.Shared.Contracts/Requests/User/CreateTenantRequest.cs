namespace OnlineExamSystem.Shared.Contracts.Requests.User;

// PlanId is optional - omitted defaults to the seeded "Full Access" plan
// (CreateTenantHandler's own fallback), same as every pre-subscription-plans
// tenant already has. IsTrial/TrialEndsAtUtc are optional - a trial org is
// manually marked as such, not inferred.
public record CreateTenantRequest(
    string Name,
    string Slug,
    Guid? PlanId = null,
    bool IsTrial = false,
    DateTime? TrialEndsAtUtc = null,
    string? OrganizationType = null,
    string? AddressLine1 = null,
    string? AddressLine2 = null,
    string? City = null,
    string? State = null,
    string? PostalCode = null,
    string? Country = null);
