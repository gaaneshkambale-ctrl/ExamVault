namespace OnlineExamSystem.Exam.Application.Exams.Delete;

public class DeleteExamResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }

    public static DeleteExamResult Ok() => new() { Success = true };

    public static DeleteExamResult NotFound() => new() { Success = false, IsNotFound = true };
}
