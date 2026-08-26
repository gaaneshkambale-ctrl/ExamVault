using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.UpdateViolationStatus;

public class UpdateViolationStatusResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public ViolationEvent? Event { get; init; }

    public static UpdateViolationStatusResult Ok(ViolationEvent violationEvent) =>
        new() { Success = true, Event = violationEvent };

    public static UpdateViolationStatusResult NotFound() => new() { IsNotFound = true };
}
