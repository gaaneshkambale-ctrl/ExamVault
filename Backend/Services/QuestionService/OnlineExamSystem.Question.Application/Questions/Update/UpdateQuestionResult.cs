using OnlineExamSystem.Question.Domain.Entities;

namespace OnlineExamSystem.Question.Application.Questions.Update;

public class UpdateQuestionResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public ExamQuestion? Question { get; init; }
    public IReadOnlyList<QuestionOption> Options { get; init; } = Array.Empty<QuestionOption>();
    public IReadOnlyList<QuestionParameter> Parameters { get; init; } = Array.Empty<QuestionParameter>();
    public IReadOnlyList<QuestionTestCase> TestCases { get; init; } = Array.Empty<QuestionTestCase>();
    public IReadOnlyList<QuestionSqlTestCase> SqlTestCases { get; init; } = Array.Empty<QuestionSqlTestCase>();

    public static UpdateQuestionResult Ok(
        ExamQuestion question,
        IReadOnlyList<QuestionOption> options,
        IReadOnlyList<QuestionParameter> parameters,
        IReadOnlyList<QuestionTestCase> testCases,
        IReadOnlyList<QuestionSqlTestCase> sqlTestCases) =>
        new()
        {
            Success = true,
            Question = question,
            Options = options,
            Parameters = parameters,
            TestCases = testCases,
            SqlTestCases = sqlTestCases,
        };

    public static UpdateQuestionResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };

    public static UpdateQuestionResult NotFound() => new() { Success = false, IsNotFound = true };
}
