using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Assignments.Create;

public class CreateAssignmentResult
{
    public bool Success { get; init; }
    public bool IsExamNotFound { get; init; }
    public bool IsExamNotPublished { get; init; }
    public bool IsGroupNotFound { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public ExamAssignment? Assignment { get; init; }
    public IReadOnlyList<Guid> TargetUserIds { get; init; } = Array.Empty<Guid>();
    public string ExamTitle { get; init; } = string.Empty;

    public static CreateAssignmentResult Ok(ExamAssignment assignment, IReadOnlyList<Guid> targetUserIds, string examTitle) =>
        new() { Success = true, Assignment = assignment, TargetUserIds = targetUserIds, ExamTitle = examTitle };

    public static CreateAssignmentResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static CreateAssignmentResult ExamNotFound() => new() { IsExamNotFound = true };

    public static CreateAssignmentResult ExamNotPublished() => new() { IsExamNotPublished = true };

    public static CreateAssignmentResult GroupNotFound() => new() { IsGroupNotFound = true };
}
