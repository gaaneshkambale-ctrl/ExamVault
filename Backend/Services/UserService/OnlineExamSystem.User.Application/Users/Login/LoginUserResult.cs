using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.Login;

public class LoginUserResult
{
    public bool Success { get; init; }
    public AppUser? User { get; init; }

    public static LoginUserResult Ok(AppUser user) => new() { Success = true, User = user };

    public static LoginUserResult InvalidCredentials() => new() { Success = false };
}
