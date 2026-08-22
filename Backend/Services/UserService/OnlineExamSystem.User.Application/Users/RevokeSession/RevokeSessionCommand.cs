namespace OnlineExamSystem.User.Application.Users.RevokeSession;

public record RevokeSessionCommand(Guid UserId, Guid SessionId);
