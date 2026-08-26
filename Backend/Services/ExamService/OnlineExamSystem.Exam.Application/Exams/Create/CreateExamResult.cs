using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Exams.Create;

public class CreateExamResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public ExamPaper? Exam { get; init; }

    public static CreateExamResult Ok(ExamPaper exam) => new() { Success = true, Exam = exam };

    public static CreateExamResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };
}
