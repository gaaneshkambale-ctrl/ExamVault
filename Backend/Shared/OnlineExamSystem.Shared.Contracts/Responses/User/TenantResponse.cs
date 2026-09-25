namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record TenantResponse(
    Guid Id,
    string Name,
    string Slug,
    bool IsActive,
    DateTime CreatedAtUtc,
    Guid PlanId = default,
    bool IsTrial = false,
    DateTime? TrialEndsAtUtc = null,
    string? OrganizationCode = null,
    string? OrganizationType = null,
    string? AddressLine1 = null,
    string? AddressLine2 = null,
    string? City = null,
    string? State = null,
    string? PostalCode = null,
    string? Country = null,
    Guid? CreatedByUserId = null,
    string? CreatedByName = null);
