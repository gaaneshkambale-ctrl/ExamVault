namespace OnlineExamSystem.Exam.Application.Exams.Create;

public record CreateExamCommand(
    string Title,
    string Description,
    string ExamType,
    int DurationMinutes,
    int TotalMarks,
    int PassingMarks,
    string Instructions,
    Guid CreatedByUserId);
