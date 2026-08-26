using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Groups.Create;

public class CreateGroupResult
{
    public bool Success { get; init; }
    public bool NameAlreadyExists { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public Group? Group { get; init; }

    public static CreateGroupResult Ok(Group group) => new() { Success = true, Group = group };

    public static CreateGroupResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static CreateGroupResult Conflict() => new() { NameAlreadyExists = true };
}
