using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Exams.ChangeStatus;

public class ChangeExamStatusResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public bool InvalidTransition { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public ExamPaper? Exam { get; init; }

    public static ChangeExamStatusResult Ok(ExamPaper exam) => new() { Success = true, Exam = exam };

    public static ChangeExamStatusResult NotFound() => new() { IsNotFound = true };

    public static ChangeExamStatusResult Invalid() => new() { InvalidTransition = true };

    public static ChangeExamStatusResult ValidationFailed(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };
}
