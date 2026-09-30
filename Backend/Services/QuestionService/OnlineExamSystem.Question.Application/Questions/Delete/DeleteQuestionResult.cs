namespace OnlineExamSystem.Question.Application.Questions.Delete;

public class DeleteQuestionResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    // Only set when Success - the deleted question's own row is gone by the
    // time the controller needs it to write a real audit entry (same
    // reasoning as DeleteExamResult's own TenantId/Title).
    public Guid TenantId { get; init; }
    public string QuestionText { get; init; } = string.Empty;

    public static DeleteQuestionResult Ok(Guid tenantId, string questionText) =>
        new() { Success = true, TenantId = tenantId, QuestionText = questionText };

    public static DeleteQuestionResult NotFound() => new() { Success = false, IsNotFound = true };
}
