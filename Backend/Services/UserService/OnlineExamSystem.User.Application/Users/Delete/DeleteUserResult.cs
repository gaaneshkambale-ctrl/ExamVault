namespace OnlineExamSystem.User.Application.Users.Delete;

public class DeleteUserResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    // Only set when Success - the deleted user's own row is gone by the time
    // the controller needs it to write a real audit entry (same reasoning as
    // DeleteExamResult's own TenantId/Title).
    public string FullName { get; init; } = string.Empty;

    public static DeleteUserResult Ok(string fullName) => new() { Success = true, FullName = fullName };

    public static DeleteUserResult NotFound() => new() { Success = false, IsNotFound = true };
}
