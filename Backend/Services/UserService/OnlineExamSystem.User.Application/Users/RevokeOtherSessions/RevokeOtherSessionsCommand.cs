namespace OnlineExamSystem.User.Application.Users.RevokeOtherSessions;

public record RevokeOtherSessionsCommand(Guid UserId, string CurrentRefreshToken);
