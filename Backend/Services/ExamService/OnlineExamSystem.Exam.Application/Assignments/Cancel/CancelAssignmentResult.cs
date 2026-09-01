namespace OnlineExamSystem.Exam.Application.Assignments.Cancel;

public class CancelAssignmentResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }

    public static CancelAssignmentResult Ok() => new() { Success = true };

    public static CancelAssignmentResult NotFound() => new() { IsNotFound = true };
}
