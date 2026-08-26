namespace OnlineExamSystem.User.Application.Users.ResetPassword;

public class ResetPasswordResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();

    public static ResetPasswordResult Ok() => new() { Success = true };

    public static ResetPasswordResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };

    public static ResetPasswordResult NotFound() => new() { Success = false, IsNotFound = true };
}
