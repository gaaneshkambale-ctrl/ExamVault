namespace OnlineExamSystem.Shared.Contracts.Responses.Exam;

// Super Admin platform-wide Sections browse only - deliberately separate
// from SectionResponse (used by a tenant Admin's own per-exam Section
// management) rather than adding ExamTitle/TenantId to that shared DTO.
public record PlatformSectionResponse(
    Guid Id,
    Guid ExamId,
    string ExamTitle,
    Guid TenantId,
    string Name,
    int DisplayOrder,
    int QuestionCount,
    int Marks,
    int DurationMinutes,
    DateTime CreatedAtUtc);
