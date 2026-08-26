namespace OnlineExamSystem.User.Application.Users.ChangePassword;

public class ChangePasswordResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public bool IsCurrentPasswordWrong { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();

    public static ChangePasswordResult Ok() => new() { Success = true };

    public static ChangePasswordResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };

    public static ChangePasswordResult NotFound() => new() { Success = false, IsNotFound = true };

    public static ChangePasswordResult CurrentPasswordWrong() =>
        new() { Success = false, IsCurrentPasswordWrong = true };
}
