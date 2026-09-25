namespace OnlineExamSystem.User.Application.Users.ConfirmEmail;

public class ConfirmEmailResult
{
    public bool Success { get; init; }
    public bool IsInvalidOrExpiredToken { get; init; }
    public bool AlreadyConfirmed { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();

    public static ConfirmEmailResult Ok() => new() { Success = true };

    // Distinct from the invalid/expired case - a used token (the common
    // case of a user clicking the link twice) is a genuinely different,
    // friendlier situation ("you're already confirmed") than a bad or
    // expired one, so the controller can word the message accordingly.
    public static ConfirmEmailResult AlreadyConfirmedResult() => new() { Success = true, AlreadyConfirmed = true };

    public static ConfirmEmailResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };

    public static ConfirmEmailResult InvalidOrExpiredToken() =>
        new() { Success = false, IsInvalidOrExpiredToken = true };
}
