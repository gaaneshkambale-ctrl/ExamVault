using System.Text.Json;

namespace OnlineExamSystem.Question.Application.QuestionBank;

public record BankCodeParameter(string Name, string Type);

// Stored in the same shape ExamQuestion's child rows use (ArgumentsJson is a
// JSON array text, ExpectedOutputJson a single JSON value), so copying into
// an exam is a straight field-for-field map and reading back is the same
// parse the exam-question endpoints already do.
public record BankCodeTestCase(string ArgumentsJson, string ExpectedOutputJson);

public record BankCodeSqlTestCase(string SetupSql, string? ExpectedOutput);

// Everything specific to a Code/Programming bank question. Persisted as one
// JSON column on BankQuestion (nobody queries inside it) rather than three
// more tables mirroring QuestionParameter/TestCase/SqlTestCase.
public record BankCodeSpec(
    string? ProgrammingLanguage,
    string? StarterCode,
    bool AllowLanguageChange,
    string? SampleAnswer,
    string? FunctionName,
    string? ReturnType,
    string? SampleInput,
    string? SampleOutput,
    string? Constraints,
    IReadOnlyList<BankCodeParameter> Parameters,
    IReadOnlyList<BankCodeTestCase> TestCases,
    IReadOnlyList<BankCodeSqlTestCase> SqlTestCases)
{
    public const int MaxJsonLength = 200_000;

    public string ToJson() => JsonSerializer.Serialize(this);

    public static BankCodeSpec? FromJson(string? json) =>
        string.IsNullOrWhiteSpace(json) ? null : JsonSerializer.Deserialize<BankCodeSpec>(json);
}
