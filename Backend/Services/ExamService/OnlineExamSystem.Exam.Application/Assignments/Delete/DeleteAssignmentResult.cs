namespace OnlineExamSystem.Exam.Application.Assignments.Delete;

public class DeleteAssignmentResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public bool IsForbidden { get; init; }

    public static DeleteAssignmentResult Ok() => new() { Success = true };

    public static DeleteAssignmentResult NotFound() => new() { IsNotFound = true };

    public static DeleteAssignmentResult Forbidden() => new() { IsForbidden = true };
}
