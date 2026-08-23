namespace OnlineExamSystem.Shared.Contracts.Responses.Exam;

public record ExamTypeResponse(Guid Id, string Name, string? Purpose, DateTime CreatedAtUtc);
