namespace OnlineExamSystem.Shared.Contracts.Requests.Exam;

public record CreateExamTypeRequest(string Name, string? Purpose = null);
