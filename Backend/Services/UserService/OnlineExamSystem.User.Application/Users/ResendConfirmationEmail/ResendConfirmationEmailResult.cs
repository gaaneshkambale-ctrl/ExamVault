namespace OnlineExamSystem.User.Application.Users.ResendConfirmationEmail;

public class ResendConfirmationEmailResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();

    // Always the outcome the caller sees regardless of whether the email
    // exists, already belongs to a confirmed account, etc. - same "never
    // reveal" principle ForgotPasswordResult documents for itself.
    public static ResendConfirmationEmailResult Ok() => new() { Success = true };

    public static ResendConfirmationEmailResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };
}
