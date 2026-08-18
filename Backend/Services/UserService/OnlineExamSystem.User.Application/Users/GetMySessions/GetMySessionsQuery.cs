namespace OnlineExamSystem.User.Application.Users.GetMySessions;

public record GetMySessionsQuery(Guid UserId, string? CurrentRefreshToken);
