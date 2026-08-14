using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.Login;

public class LoginUserResult
{
    public bool Success { get; init; }
    public bool IsAccountDeactivated { get; init; }
    public AppUser? User { get; init; }
    public string? AccessToken { get; init; }
    public string? RefreshToken { get; init; }

    public static LoginUserResult Ok(AppUser user, string accessToken, string refreshToken) =>
        new() { Success = true, User = user, AccessToken = accessToken, RefreshToken = refreshToken };

    public static LoginUserResult InvalidCredentials() => new() { Success = false };

    public static LoginUserResult AccountDeactivated() => new() { Success = false, IsAccountDeactivated = true };
}
