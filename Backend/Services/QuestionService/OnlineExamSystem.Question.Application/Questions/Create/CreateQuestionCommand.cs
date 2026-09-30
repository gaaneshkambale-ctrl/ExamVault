namespace OnlineExamSystem.Question.Application.Questions.Create;

public record CreateQuestionCommand(
    Guid ExamId,
    string QuestionType,
    string QuestionText,
    int Marks,
    string Difficulty,
    IReadOnlyList<QuestionOptionInput> Options,
    Guid CreatedByUserId,
    bool ShuffleOptions = false,
    string? StarterCode = null,
    string? ProgrammingLanguage = null,
    bool AllowLanguageChange = false,
    string? SampleAnswer = null,
    string? FunctionName = null,
    string? ReturnType = null,
    IReadOnlyList<QuestionParameterInput>? Parameters = null,
    IReadOnlyList<QuestionTestCaseInput>? TestCases = null,
    IReadOnlyList<QuestionSqlTestCaseInput>? SqlTestCases = null,
    string? SampleInput = null,
    string? SampleOutput = null,
    string? Constraints = null,
    // Forwarded to Execution Service to precompute Sql test cases' Expected
    // Output - only needed when SqlTestCases is non-empty, same
    // caller-forwards-own-token pattern RunSqlCommand already uses.
    string? BearerToken = null);
