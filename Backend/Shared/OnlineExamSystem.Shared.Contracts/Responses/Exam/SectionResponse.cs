namespace OnlineExamSystem.Shared.Contracts.Responses.Exam;

public record SectionResponse(
    Guid Id,
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
    bool AllowReview,
    DateTime CreatedAtUtc);
