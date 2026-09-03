namespace OnlineExamSystem.User.Application.Tenants.Create;

public record CreateTenantCommand(
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
