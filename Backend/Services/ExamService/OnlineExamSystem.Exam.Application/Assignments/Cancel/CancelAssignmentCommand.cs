namespace OnlineExamSystem.Exam.Application.Assignments.Cancel;

public record CancelAssignmentCommand(Guid AssignmentId, Guid? OwnerUserId = null);
