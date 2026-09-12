namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record RolePermissionsResponse(
    string Role,
    IReadOnlyList<string> Permissions,
    DateTime? UpdatedAtUtc,
    Guid? UpdatedByUserId = null,
    string? UpdatedByName = null);
