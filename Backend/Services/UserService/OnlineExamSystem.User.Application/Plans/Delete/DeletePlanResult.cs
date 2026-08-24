namespace OnlineExamSystem.User.Application.Plans.Delete;

public class DeletePlanResult
{
    public bool Success { get; init; }
    public bool NotFound { get; init; }
    public bool InUse { get; init; }

    public static DeletePlanResult Ok() => new() { Success = true };

    public static DeletePlanResult NoPlan() => new() { NotFound = true };

    public static DeletePlanResult StillInUse() => new() { InUse = true };
}
