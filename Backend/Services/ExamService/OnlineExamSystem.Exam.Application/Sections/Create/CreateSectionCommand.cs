namespace OnlineExamSystem.Exam.Application.Sections.Create;

public record CreateSectionCommand(
    Guid ExamId,
    string Name,
    string Description,
    string Instructions,
    int DisplayOrder,
    int QuestionCount,
    int Marks,
    int DurationMinutes,
    string NavigationType,
    bool NegativeMarkingEnabled,
    decimal NegativeMarks,
    bool ShuffleQuestions,
    bool ShuffleOptions,
    bool AllowReview);
