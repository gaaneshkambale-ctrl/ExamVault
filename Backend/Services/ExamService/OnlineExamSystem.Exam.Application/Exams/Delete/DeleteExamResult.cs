namespace OnlineExamSystem.Exam.Application.Exams.Delete;

public class DeleteExamResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    // Only set when Success - the exam's own row is gone by the time the
    // controller sees this, so it needs these carried back to write a real
    // audit entry (same "TenantId is the affected org, entityId/details
    // identify what happened" shape Create's own audit call already uses).
    public Guid TenantId { get; init; }
    public string Title { get; init; } = string.Empty;

    public static DeleteExamResult Ok(Guid tenantId, string title) =>
        new() { Success = true, TenantId = tenantId, Title = title };

    public static DeleteExamResult NotFound() => new() { Success = false, IsNotFound = true };
}
