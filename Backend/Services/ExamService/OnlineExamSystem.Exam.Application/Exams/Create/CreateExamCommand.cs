namespace OnlineExamSystem.Exam.Application.Exams.Create;

public record CreateExamCommand(
    string Title,
    string Description,
    string Category,
    bool ContainsSections,
    string CreationMethod,
    int DurationMinutes,
    int TotalMarks,
    int PassingMarks,
    string Instructions,
    Guid CreatedByUserId,
    string? ExamCode = null,
    Guid? ExamTypeId = null);
