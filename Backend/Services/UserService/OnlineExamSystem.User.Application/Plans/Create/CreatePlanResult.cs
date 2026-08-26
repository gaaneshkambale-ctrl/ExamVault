using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Plans.Create;

public class CreatePlanResult
{
    public bool Success { get; init; }
    public bool NameAlreadyExists { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public Plan? Plan { get; init; }

    public static CreatePlanResult Ok(Plan plan) => new() { Success = true, Plan = plan };

    public static CreatePlanResult Invalid(IReadOnlyList<string> errors) => new() { ValidationErrors = errors };

    public static CreatePlanResult Conflict() => new() { NameAlreadyExists = true };
}
