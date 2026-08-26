using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.Create;

public class CreateUserResult
{
    public bool Success { get; init; }
    public bool EmailAlreadyExists { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public AppUser? User { get; init; }

    public static CreateUserResult Ok(AppUser user) => new() { Success = true, User = user };

    public static CreateUserResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };

    public static CreateUserResult Conflict() => new() { Success = false, EmailAlreadyExists = true };
}
