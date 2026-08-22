namespace OnlineExamSystem.Shared.Contracts.Responses.Notification;

public record AuditLogResponse(
    Guid Id,
    DateTime TimestampUtc,
    string Module,
    string Activity,
    string? Details,
    string? EntityId,
    Guid? UserId,
    string? UserName,
    string? IpAddress);
