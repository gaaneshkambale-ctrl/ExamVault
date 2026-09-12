namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record CreateTenantAdminRequest(
    string FullName,
    string Email,
    string? PhoneNumber = null,
    string? Designation = null);
