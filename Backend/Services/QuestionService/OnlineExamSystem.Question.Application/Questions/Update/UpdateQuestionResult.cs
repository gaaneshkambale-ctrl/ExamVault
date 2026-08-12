using OnlineExamSystem.Question.Domain.Entities;

namespace OnlineExamSystem.Question.Application.Questions.Update;

public class UpdateQuestionResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public ExamQuestion? Question { get; init; }
    public IReadOnlyList<QuestionOption> Options { get; init; } = Array.Empty<QuestionOption>();

    public static UpdateQuestionResult Ok(ExamQuestion question, IReadOnlyList<QuestionOption> options) =>
        new() { Success = true, Question = question, Options = options };

    public static UpdateQuestionResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };

    public static UpdateQuestionResult NotFound() => new() { Success = false, IsNotFound = true };
}
