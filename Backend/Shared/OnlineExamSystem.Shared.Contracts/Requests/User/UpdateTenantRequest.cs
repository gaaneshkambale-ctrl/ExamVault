namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record UpdateTenantRequest(
    string Name,
    string Slug,
    string? OrganizationCode = null,
    string? OrganizationType = null);
