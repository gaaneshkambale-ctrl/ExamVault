using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.SetActiveStatus;

public class SetUserActiveStatusResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public AppUser? User { get; init; }

    public static SetUserActiveStatusResult Ok(AppUser user) => new() { Success = true, User = user };

    public static SetUserActiveStatusResult NotFound() => new() { IsNotFound = true };
}
