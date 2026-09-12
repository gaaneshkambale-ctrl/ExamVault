namespace OnlineExamSystem.Shared.Contracts.Requests.Exam;

public record CreateExamRequest(
    string Title,
    string Description,
    string Category,
    bool ContainsSections,
    string CreationMethod,
    int DurationMinutes,
    int TotalMarks,
    int PassingMarks,
    string Instructions,
    string? ExamCode = null,
    Guid? ExamTypeId = null,
    string Tags = "");
