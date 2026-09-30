namespace OnlineExamSystem.Exam.Application.Assignments.GetById;

public record GetAssignmentQuery(Guid AssignmentId, Guid? OwnerUserId = null);
