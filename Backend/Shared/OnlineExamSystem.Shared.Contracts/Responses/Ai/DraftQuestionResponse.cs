namespace OnlineExamSystem.Shared.Contracts.Responses.Ai;

public record DraftQuestionOptionResponse(string OptionText, bool IsCorrect);

public record DraftQuestionResponse(
    Guid Id,
    string QuestionType,
    string QuestionText,
    int Marks,
    string Difficulty,
    IReadOnlyList<DraftQuestionOptionResponse> Options);
