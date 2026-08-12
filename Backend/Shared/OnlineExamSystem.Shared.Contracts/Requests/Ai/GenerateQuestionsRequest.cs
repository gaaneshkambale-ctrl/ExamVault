namespace OnlineExamSystem.Shared.Contracts.Requests.Ai;

public record GenerateQuestionsRequest(
    string Source,
    Guid? ExamId,
    string? Topic,
    int QuestionCount,
    IReadOnlyList<string> QuestionTypes,
    IReadOnlyList<string> DifficultyLevels,
    string? AdditionalInstructions);
