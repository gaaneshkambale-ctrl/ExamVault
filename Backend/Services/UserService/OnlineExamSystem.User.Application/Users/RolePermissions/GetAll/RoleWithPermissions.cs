namespace OnlineExamSystem.User.Application.Users.RolePermissions.GetAll;

public record RoleWithPermissions(string Role, IReadOnlyList<string> Permissions, DateTime? UpdatedAtUtc);
