using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Sections.Update;

public class UpdateSectionResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public Section? Section { get; init; }

    public static UpdateSectionResult Ok(Section section) => new() { Success = true, Section = section };

    public static UpdateSectionResult Invalid(IReadOnlyList<string> errors) => new() { ValidationErrors = errors };

    public static UpdateSectionResult NotFound() => new() { IsNotFound = true };
}
