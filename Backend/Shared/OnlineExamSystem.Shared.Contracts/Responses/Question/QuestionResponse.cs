using System.Text.Json;

namespace OnlineExamSystem.Shared.Contracts.Responses.Question;

public record QuestionOptionResponse(Guid Id, string OptionText, bool IsCorrect, int DisplayOrder);

public record QuestionParameterResponse(string Name, string Type, int DisplayOrder);

public record QuestionTestCaseResponse(
    IReadOnlyList<JsonElement> Arguments,
    JsonElement ExpectedOutput,
    int DisplayOrder);

// Sql questions only - always unmasked (setup SQL isn't the secret, only
// the Reference Query held in SampleAnswer is).
public record QuestionSqlTestCaseResponse(string SetupSql, int DisplayOrder);

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
    IReadOnlyList<QuestionSqlTestCaseResponse>? SqlTestCases = null);
