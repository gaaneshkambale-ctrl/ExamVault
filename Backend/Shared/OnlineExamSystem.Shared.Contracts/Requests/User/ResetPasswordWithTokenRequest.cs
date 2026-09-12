namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record ResetPasswordWithTokenRequest(string Token, string NewPassword);
