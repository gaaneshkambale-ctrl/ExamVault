namespace OnlineExamSystem.Question.Application.Questions.Delete;

public class DeleteQuestionResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }

    public static DeleteQuestionResult Ok() => new() { Success = true };

    public static DeleteQuestionResult NotFound() => new() { Success = false, IsNotFound = true };
}
