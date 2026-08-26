namespace OnlineExamSystem.Exam.Application.ExamTypes.Delete;

public class DeleteExamTypeResult
{
    public bool IsNotFound { get; init; }

    public static DeleteExamTypeResult Ok() => new();

    public static DeleteExamTypeResult NotFound() => new() { IsNotFound = true };
}
