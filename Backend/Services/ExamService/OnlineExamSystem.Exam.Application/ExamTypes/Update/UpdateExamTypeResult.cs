using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.ExamTypes.Update;

public class UpdateExamTypeResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public ExamType? ExamType { get; init; }

    public static UpdateExamTypeResult Ok(ExamType examType) => new() { Success = true, ExamType = examType };

    public static UpdateExamTypeResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };

    public static UpdateExamTypeResult NotFound() => new() { Success = false, IsNotFound = true };
}
