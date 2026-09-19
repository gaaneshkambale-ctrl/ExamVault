namespace OnlineExamSystem.User.Application.Users.ForgotPassword;

public record ForgotPasswordCommand(string Email, string? TenantSlug = null);
