namespace OnlineExamSystem.Ai.Application.Generate;

public record GenerateQuestionsRequest(
    string Source,
    Guid? ExamId,
    string? Topic,
    int QuestionCount,
    IReadOnlyList<string> QuestionTypes,
    IReadOnlyList<string> DifficultyLevels,
    string? AdditionalInstructions);
