namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record UserListItemResponse(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    DateTime CreatedAtUtc,
    bool IsActive,
    string? PhoneNumber,
    bool HasPhoto = false,
    string? RollNumber = null,
    // Only meaningful to a Super Admin caller (GetAllAsync only ever
    // returns other tenants' users to them) - a regular Admin's own
    // "Manage Users" list is always their own tenant already, so the
    // frontend there has no reason to render it.
    Guid TenantId = default,
    DateTime? LastLoginAtUtc = null,
    Guid? CreatedByUserId = null,
    string? CreatedByName = null);
