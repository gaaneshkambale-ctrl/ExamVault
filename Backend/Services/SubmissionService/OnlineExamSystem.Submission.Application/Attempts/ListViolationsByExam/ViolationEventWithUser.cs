using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.ListViolationsByExam;

public record ViolationEventWithUser(ViolationEvent Event, Guid UserId);
