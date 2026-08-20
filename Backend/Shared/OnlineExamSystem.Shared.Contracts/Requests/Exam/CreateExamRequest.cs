namespace OnlineExamSystem.Shared.Contracts.Requests.Exam;

public record CreateExamRequest(
    string Title,
    string Description,
    string Category,
    bool ContainsSections,
    string ExamType,
    int DurationMinutes,
    int TotalMarks,
    int PassingMarks,
    string Instructions);
