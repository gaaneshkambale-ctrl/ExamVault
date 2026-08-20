namespace OnlineExamSystem.Shared.Contracts.Responses.Question;

public record QuestionOptionResponse(Guid Id, string OptionText, bool IsCorrect, int DisplayOrder);

public record QuestionResponse(
    Guid Id,
    Guid ExamId,
    Guid? SectionId,
    string QuestionType,
    string QuestionText,
    int Marks,
    string Difficulty,
    bool ShuffleOptions,
    IReadOnlyList<QuestionOptionResponse> Options,
    DateTime CreatedOn);
