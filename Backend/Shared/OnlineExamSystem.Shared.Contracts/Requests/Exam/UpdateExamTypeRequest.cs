namespace OnlineExamSystem.Shared.Contracts.Requests.Exam;

public record UpdateExamTypeRequest(string Name, string? Purpose = null);
