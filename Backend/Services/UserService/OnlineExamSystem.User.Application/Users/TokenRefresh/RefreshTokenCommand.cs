namespace OnlineExamSystem.User.Application.Users.TokenRefresh;

public record RefreshTokenCommand(string RefreshToken, string? UserAgent = null);
