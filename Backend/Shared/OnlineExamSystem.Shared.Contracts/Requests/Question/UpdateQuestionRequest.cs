namespace OnlineExamSystem.Shared.Contracts.Requests.Question;

public record UpdateQuestionRequest(
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
