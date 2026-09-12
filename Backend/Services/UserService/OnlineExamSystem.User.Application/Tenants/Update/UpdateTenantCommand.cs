namespace OnlineExamSystem.User.Application.Tenants.Update;

public record UpdateTenantCommand(
    Guid TenantId,
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
