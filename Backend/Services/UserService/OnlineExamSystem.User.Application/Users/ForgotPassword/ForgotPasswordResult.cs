namespace OnlineExamSystem.User.Application.Users.ForgotPassword;

public class ForgotPasswordResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();

    // Always the outcome the caller sees regardless of whether the email/
    // tenant combination actually exists - see ForgotPasswordHandler's own
    // comment for why (same "never reveal" principle LoginUserHandler uses).
    public static ForgotPasswordResult Ok() => new() { Success = true };

    public static ForgotPasswordResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };
}
