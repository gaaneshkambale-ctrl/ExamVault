using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Assignments.Create;

public class CreateAssignmentResult
{
    public bool Success { get; init; }
    public bool IsExamNotFound { get; init; }
    public bool IsExamNotPublished { get; init; }
    public bool IsGroupNotFound { get; init; }
    public bool IsForbidden { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public ExamAssignment? Assignment { get; init; }
    public IReadOnlyList<Guid> TargetUserIds { get; init; } = Array.Empty<Guid>();
    public string ExamTitle { get; init; } = string.Empty;

    // Populated only when the request was rejected for academic-eligibility
    // reasons (no override supplied, or override supplied by a non-Admin
    // caller who isn't allowed to use it).
    public bool IsEligibilityRejected { get; init; }
    public string? EligibilityScopeDescription { get; init; }
    public IReadOnlyList<string> IneligibleStudentNames { get; init; } = Array.Empty<string>();
    public int OverriddenCount { get; init; }

    public static CreateAssignmentResult Ok(
        ExamAssignment assignment,
        IReadOnlyList<Guid> targetUserIds,
        string examTitle,
        int overriddenCount = 0) =>
        new()
        {
            Success = true,
            Assignment = assignment,
            TargetUserIds = targetUserIds,
            ExamTitle = examTitle,
            OverriddenCount = overriddenCount,
        };

    public static CreateAssignmentResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static CreateAssignmentResult ExamNotFound() => new() { IsExamNotFound = true };

    public static CreateAssignmentResult ExamNotPublished() => new() { IsExamNotPublished = true };

    public static CreateAssignmentResult GroupNotFound() => new() { IsGroupNotFound = true };

    public static CreateAssignmentResult Forbidden() => new() { IsForbidden = true };

    public static CreateAssignmentResult EligibilityRejected(
        string scopeDescription,
        IReadOnlyList<string> ineligibleStudentNames) =>
        new()
        {
            IsEligibilityRejected = true,
            EligibilityScopeDescription = scopeDescription,
            IneligibleStudentNames = ineligibleStudentNames,
        };
}
