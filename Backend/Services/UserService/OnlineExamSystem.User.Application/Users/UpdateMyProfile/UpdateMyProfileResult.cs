using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.UpdateMyProfile;

public class UpdateMyProfileResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public AppUser? User { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();

    public static UpdateMyProfileResult Ok(AppUser user) => new() { Success = true, User = user };

    public static UpdateMyProfileResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };

    public static UpdateMyProfileResult NotFound() => new() { Success = false, IsNotFound = true };
}
