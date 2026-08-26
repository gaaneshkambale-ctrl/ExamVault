namespace OnlineExamSystem.User.Application.Users.TokenRefresh;

public class RefreshTokenResult
{
    public bool Success { get; init; }
    public string? AccessToken { get; init; }
    public string? RefreshToken { get; init; }

    public static RefreshTokenResult Ok(string accessToken, string refreshToken) =>
        new() { Success = true, AccessToken = accessToken, RefreshToken = refreshToken };

    public static RefreshTokenResult Invalid() => new() { Success = false };
}
