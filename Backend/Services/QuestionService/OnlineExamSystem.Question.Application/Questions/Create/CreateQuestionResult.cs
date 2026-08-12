using OnlineExamSystem.Question.Domain.Entities;

namespace OnlineExamSystem.Question.Application.Questions.Create;

public class CreateQuestionResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public ExamQuestion? Question { get; init; }
    public IReadOnlyList<QuestionOption> Options { get; init; } = Array.Empty<QuestionOption>();

    public static CreateQuestionResult Ok(ExamQuestion question, IReadOnlyList<QuestionOption> options) =>
        new() { Success = true, Question = question, Options = options };

    public static CreateQuestionResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };
}
