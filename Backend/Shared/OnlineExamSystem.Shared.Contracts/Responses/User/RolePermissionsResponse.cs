namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record RolePermissionsResponse(string Role, IReadOnlyList<string> Permissions);
