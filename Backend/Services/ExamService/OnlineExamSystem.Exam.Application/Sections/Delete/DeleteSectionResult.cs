namespace OnlineExamSystem.Exam.Application.Sections.Delete;

public class DeleteSectionResult
{
    public bool IsNotFound { get; init; }

    public static DeleteSectionResult Ok() => new();

    public static DeleteSectionResult NotFound() => new() { IsNotFound = true };
}
