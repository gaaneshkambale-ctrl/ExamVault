using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.ExamTypes.SetStatus;

public class SetExamTypeStatusResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public ExamType? ExamType { get; init; }

    public static SetExamTypeStatusResult Ok(ExamType examType) => new() { Success = true, ExamType = examType };

    public static SetExamTypeStatusResult NotFound() => new() { Success = false, IsNotFound = true };
}
