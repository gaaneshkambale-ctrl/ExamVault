namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record ForgotPasswordRequest(string Email, string? TenantSlug = null);
