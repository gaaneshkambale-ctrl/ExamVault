namespace OnlineExamSystem.Question.Application.Questions.Update;

public record UpdateQuestionCommand(
    Guid QuestionId,
    string QuestionType,
    string QuestionText,
    int Marks,
    string Difficulty,
    IReadOnlyList<QuestionOptionInput> Options);
