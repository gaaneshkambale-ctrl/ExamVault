namespace OnlineExamSystem.Question.Application.Questions.Create;

public record CreateQuestionCommand(
    Guid ExamId,
    string QuestionType,
    string QuestionText,
    int Marks,
    string Difficulty,
    IReadOnlyList<QuestionOptionInput> Options,
    Guid CreatedByUserId,
    bool ShuffleOptions = false);
