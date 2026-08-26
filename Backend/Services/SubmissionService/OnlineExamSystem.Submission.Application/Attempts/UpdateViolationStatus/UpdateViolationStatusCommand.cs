using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.UpdateViolationStatus;

public record UpdateViolationStatusCommand(Guid ViolationId, ViolationStatus NewStatus, Guid AdminUserId);
