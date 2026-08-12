namespace OnlineExamSystem.Shared.Contracts.Requests.Question;

public record CreateQuestionOptionRequest(string OptionText, bool IsCorrect);

public record CreateQuestionRequest(
    Guid ExamId,
    string QuestionType,
    string QuestionText,
    int Marks,
    string Difficulty,
    IReadOnlyList<CreateQuestionOptionRequest> Options);
