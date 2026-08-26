namespace OnlineExamSystem.User.Application.Users.ResetPassword;

public record ResetPasswordCommand(Guid UserId, string NewPassword);
