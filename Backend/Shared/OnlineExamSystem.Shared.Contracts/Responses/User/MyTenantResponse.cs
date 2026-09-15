namespace OnlineExamSystem.Shared.Contracts.Responses.User;

// Deliberately a narrower shape than TenantResponse - this is self-service,
// reachable by any authenticated role (Student included, not just Admin),
// so it exposes only what a report header needs (name/address) and none of
// TenantResponse's plan/billing/audit fields.
public record MyTenantResponse(
    string Name,
    string? AddressLine1 = null,
    string? AddressLine2 = null,
    string? City = null,
    string? State = null,
    string? PostalCode = null,
    string? Country = null);
