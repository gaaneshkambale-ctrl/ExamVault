using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.Update;

public class UpdateUserResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public bool EmailAlreadyExists { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public AppUser? User { get; init; }

    public static UpdateUserResult Ok(AppUser user) => new() { Success = true, User = user };

    public static UpdateUserResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };

    public static UpdateUserResult NotFound() => new() { Success = false, IsNotFound = true };

    public static UpdateUserResult Conflict() => new() { Success = false, EmailAlreadyExists = true };
}
