namespace OnlineExamSystem.Exam.Application.Assignments.Cancel;

public class CancelAssignmentResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public bool IsForbidden { get; init; }

    public static CancelAssignmentResult Ok() => new() { Success = true };

    public static CancelAssignmentResult NotFound() => new() { IsNotFound = true };

    public static CancelAssignmentResult Forbidden() => new() { IsForbidden = true };
}
