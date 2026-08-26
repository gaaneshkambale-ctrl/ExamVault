namespace OnlineExamSystem.Shared.Contracts.Requests.Exam;

public record SectionRequest(
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
