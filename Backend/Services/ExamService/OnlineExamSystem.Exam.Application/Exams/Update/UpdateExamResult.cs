using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Exams.Update;

public class UpdateExamResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public ExamPaper? Exam { get; init; }

    public static UpdateExamResult Ok(ExamPaper exam) => new() { Success = true, Exam = exam };

    public static UpdateExamResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };

    public static UpdateExamResult NotFound() => new() { Success = false, IsNotFound = true };
}
