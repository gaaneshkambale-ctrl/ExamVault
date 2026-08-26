using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.Register;

public class RegisterUserResult
{
    public bool Success { get; init; }
    public bool EmailAlreadyExists { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public AppUser? User { get; init; }

    public static RegisterUserResult Ok(AppUser user) => new() { Success = true, User = user };

    public static RegisterUserResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };

    public static RegisterUserResult Conflict() => new() { Success = false, EmailAlreadyExists = true };
}
