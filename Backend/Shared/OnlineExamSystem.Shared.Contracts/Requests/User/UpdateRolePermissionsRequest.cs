namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record UpdateRolePermissionsRequest(IReadOnlyList<string> Permissions);
