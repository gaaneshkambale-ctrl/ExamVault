namespace OnlineExamSystem.Exam.Application.ExamTypes.SetStatus;

public record SetExamTypeStatusCommand(Guid ExamTypeId, bool IsActive);
