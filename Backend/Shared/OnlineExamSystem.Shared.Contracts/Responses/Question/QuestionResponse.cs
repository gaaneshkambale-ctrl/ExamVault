using System.Text.Json;

namespace OnlineExamSystem.Shared.Contracts.Responses.Question;

public record QuestionOptionResponse(Guid Id, string OptionText, bool IsCorrect, int DisplayOrder);

public record QuestionParameterResponse(string Name, string Type, int DisplayOrder);

public record QuestionTestCaseResponse(
    IReadOnlyList<JsonElement> Arguments,
    JsonElement ExpectedOutput,
    int DisplayOrder);

// Sql questions only - always unmasked (setup SQL isn't the secret, only
// the Reference Query held in SampleAnswer is). ExpectedOutput is
// precomputed when the admin saves the question (see
// QuestionSqlTestCase.ExpectedOutput) - null when it hasn't been computed
// yet or the reference query failed to run.
public record QuestionSqlTestCaseResponse(string SetupSql, int DisplayOrder, string? ExpectedOutput = null);

public record QuestionResponse(
    Guid Id,
    Guid ExamId,
    Guid? SectionId,
    string QuestionType,
    string QuestionText,
    int Marks,
    string Difficulty,
    bool ShuffleOptions,
    IReadOnlyList<QuestionOptionResponse> Options,
    DateTime CreatedOn,
    string? StarterCode = null,
    string? ProgrammingLanguage = null,
    bool AllowLanguageChange = false,
    // Reference solution for the grading admin only - null for a student
    // caller, same masking principle as QuestionOptionResponse.IsCorrect.
    string? SampleAnswer = null,
    // Auto-grading capability, additive on top of StarterCode - present
    // only when the admin gave this question a function signature. All
    // visible to every caller (student included), unlike SampleAnswer.
    string? FunctionName = null,
    string? ReturnType = null,
    IReadOnlyList<QuestionParameterResponse>? Parameters = null,
    IReadOnlyList<QuestionTestCaseResponse>? TestCases = null,
    IReadOnlyList<QuestionSqlTestCaseResponse>? SqlTestCases = null,
    // Illustrative example + notes shown to the student alongside the
    // problem statement - unmasked for every caller, same visibility as
    // FunctionName (unlike SampleAnswer, which is admin-only).
    string? SampleInput = null,
    string? SampleOutput = null,
    string? Constraints = null);
