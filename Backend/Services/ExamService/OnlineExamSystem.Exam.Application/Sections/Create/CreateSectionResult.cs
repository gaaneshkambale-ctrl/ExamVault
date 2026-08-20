using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Sections.Create;

public class CreateSectionResult
{
    public bool Success { get; init; }
    public bool IsExamNotFound { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public Section? Section { get; init; }

    public static CreateSectionResult Ok(Section section) => new() { Success = true, Section = section };

    public static CreateSectionResult Invalid(IReadOnlyList<string> errors) => new() { ValidationErrors = errors };

    public static CreateSectionResult ExamNotFound() => new() { IsExamNotFound = true };
}
