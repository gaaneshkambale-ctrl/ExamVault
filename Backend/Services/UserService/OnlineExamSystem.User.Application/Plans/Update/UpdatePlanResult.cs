using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Plans.Update;

public class UpdatePlanResult
{
    public bool Success { get; init; }
    public bool NotFound { get; init; }
    public bool NameAlreadyExists { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public Plan? Plan { get; init; }

    public static UpdatePlanResult Ok(Plan plan) => new() { Success = true, Plan = plan };

    public static UpdatePlanResult Invalid(IReadOnlyList<string> errors) => new() { ValidationErrors = errors };

    public static UpdatePlanResult NoPlan() => new() { NotFound = true };

    public static UpdatePlanResult Conflict() => new() { NameAlreadyExists = true };
}
