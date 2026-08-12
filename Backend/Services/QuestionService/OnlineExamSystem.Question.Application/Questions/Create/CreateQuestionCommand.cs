namespace OnlineExamSystem.Question.Application.Questions.Create;

public record CreateQuestionOptionInput(string OptionText, bool IsCorrect);

public record CreateQuestionCommand(
    Guid ExamId,
    string QuestionType,
    string QuestionText,
    int Marks,
    string Difficulty,
    IReadOnlyList<CreateQuestionOptionInput> Options,
    Guid CreatedByUserId);
