namespace OnlineExamSystem.Shared.Contracts.Requests.Question;

public record UpdateQuestionRequest(
    string QuestionType,
    string QuestionText,
    int Marks,
    string Difficulty,
    IReadOnlyList<CreateQuestionOptionRequest> Options,
    bool ShuffleOptions = false);
