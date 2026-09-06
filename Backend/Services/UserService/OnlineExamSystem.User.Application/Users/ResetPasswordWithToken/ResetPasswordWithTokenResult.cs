namespace OnlineExamSystem.User.Application.Users.ResetPasswordWithToken;

public class ResetPasswordWithTokenResult
{
    public bool Success { get; init; }
    public bool IsInvalidOrExpiredToken { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();

    public static ResetPasswordWithTokenResult Ok() => new() { Success = true };

    public static ResetPasswordWithTokenResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };

    public static ResetPasswordWithTokenResult InvalidOrExpiredToken() =>
        new() { Success = false, IsInvalidOrExpiredToken = true };
}
