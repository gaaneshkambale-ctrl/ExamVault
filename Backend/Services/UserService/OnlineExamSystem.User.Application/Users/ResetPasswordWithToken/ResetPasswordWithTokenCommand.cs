namespace OnlineExamSystem.User.Application.Users.ResetPasswordWithToken;

public record ResetPasswordWithTokenCommand(string Token, string NewPassword);
