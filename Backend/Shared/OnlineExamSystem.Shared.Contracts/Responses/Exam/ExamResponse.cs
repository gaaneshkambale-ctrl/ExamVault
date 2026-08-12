namespace OnlineExamSystem.Shared.Contracts.Responses.Exam;

public record ExamResponse(
    Guid Id,
    string Title,
    string Description,
    string ExamType,
    int DurationMinutes,
    int TotalMarks,
    int PassingMarks,
    string Instructions,
    string Status,
    int TotalQuestions,
    DateTime CreatedOn);
