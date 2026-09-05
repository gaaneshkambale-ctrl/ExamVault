namespace OnlineExamSystem.Exam.Application.ExamTypes.Update;

public record UpdateExamTypeCommand(Guid ExamTypeId, string Name, string? Purpose);
