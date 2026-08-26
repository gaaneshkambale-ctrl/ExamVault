using OnlineExamSystem.Question.Domain.Entities;

namespace OnlineExamSystem.Question.Application.Questions.Create;

public class CreateQuestionResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public ExamQuestion? Question { get; init; }
    public IReadOnlyList<QuestionOption> Options { get; init; } = Array.Empty<QuestionOption>();
    public IReadOnlyList<QuestionParameter> Parameters { get; init; } = Array.Empty<QuestionParameter>();
    public IReadOnlyList<QuestionTestCase> TestCases { get; init; } = Array.Empty<QuestionTestCase>();
    public IReadOnlyList<QuestionSqlTestCase> SqlTestCases { get; init; } = Array.Empty<QuestionSqlTestCase>();

    public static CreateQuestionResult Ok(
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

    public static CreateQuestionResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };
}
