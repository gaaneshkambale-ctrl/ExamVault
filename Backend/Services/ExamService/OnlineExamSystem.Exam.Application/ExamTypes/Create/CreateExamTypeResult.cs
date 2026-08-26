using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.ExamTypes.Create;

public class CreateExamTypeResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public ExamType? ExamType { get; init; }

    public static CreateExamTypeResult Ok(ExamType examType) => new() { Success = true, ExamType = examType };

    public static CreateExamTypeResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };
}
