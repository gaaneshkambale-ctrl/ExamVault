namespace OnlineExamSystem.User.Application.Users.ChangePassword;

// CurrentRefreshToken (optional): the caller's own session, kept alive while
// every OTHER session is revoked; null revokes them all.
public record ChangePasswordCommand(Guid UserId, string CurrentPassword, string NewPassword, string? CurrentRefreshToken = null);
