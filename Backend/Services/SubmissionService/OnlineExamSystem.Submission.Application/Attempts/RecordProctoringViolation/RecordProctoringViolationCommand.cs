using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.RecordProctoringViolation;

public record RecordProctoringViolationCommand(Guid AttemptId, Guid UserId, ProctoringViolationType Type);
