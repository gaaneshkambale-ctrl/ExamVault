using System.Text.Json;

namespace OnlineExamSystem.Shared.Contracts.Requests.Question;

public record CreateQuestionOptionRequest(string OptionText, bool IsCorrect);

public record QuestionParameterRequest(string Name, string Type);

// Arguments/ExpectedOutput carry typed values (numbers, strings, booleans,
// arrays) as raw JSON - e.g. Arguments: [[12,35,1,10,34,1]] for a single
// IntArray parameter, ExpectedOutput: 34 for an Int return type.
public record QuestionTestCaseRequest(IReadOnlyList<JsonElement> Arguments, JsonElement ExpectedOutput);

// Sql questions only - schema + seed data for one test case's fresh
// database. No arguments/expectedOutput here; the expected result is
// always derived by running the question's Reference Query (SampleAnswer)
// against this same setup, never hand-typed.
public record QuestionSqlTestCaseRequest(string SetupSql);

public record CreateQuestionRequest(
    Guid ExamId,
    string QuestionType,
    string QuestionText,
    int Marks,
    string Difficulty,
    IReadOnlyList<CreateQuestionOptionRequest> Options,
    bool ShuffleOptions = false,
    string? StarterCode = null,
    string? ProgrammingLanguage = null,
    bool AllowLanguageChange = false,
    string? SampleAnswer = null,
    string? FunctionName = null,
    string? ReturnType = null,
    IReadOnlyList<QuestionParameterRequest>? Parameters = null,
    IReadOnlyList<QuestionTestCaseRequest>? TestCases = null,
    IReadOnlyList<QuestionSqlTestCaseRequest>? SqlTestCases = null);
