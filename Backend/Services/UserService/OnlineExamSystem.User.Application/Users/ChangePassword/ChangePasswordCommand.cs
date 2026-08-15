namespace OnlineExamSystem.User.Application.Users.ChangePassword;

public record ChangePasswordCommand(Guid UserId, string CurrentPassword, string NewPassword);
