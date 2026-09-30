namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record UpdateTenantRequest(
    string Name,
    string Slug,
    string? OrganizationCode = null,
    string? OrganizationType = null,
    string? AddressLine1 = null,
    string? AddressLine2 = null,
    string? City = null,
    string? State = null,
    string? PostalCode = null,
    string? Country = null);
