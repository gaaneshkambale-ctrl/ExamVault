using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Assignments.Update;

public class UpdateAssignmentResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public bool IsGroupNotFound { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public ExamAssignment? Assignment { get; init; }
    public IReadOnlyList<Guid> TargetUserIds { get; init; } = Array.Empty<Guid>();

    public static UpdateAssignmentResult Ok(ExamAssignment assignment, IReadOnlyList<Guid> targetUserIds) =>
        new() { Success = true, Assignment = assignment, TargetUserIds = targetUserIds };

    public static UpdateAssignmentResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static UpdateAssignmentResult NotFound() => new() { IsNotFound = true };

    public static UpdateAssignmentResult GroupNotFound() => new() { IsGroupNotFound = true };
}
