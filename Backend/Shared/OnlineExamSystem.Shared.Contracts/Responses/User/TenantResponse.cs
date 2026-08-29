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
    string? OrganizationType = null);
