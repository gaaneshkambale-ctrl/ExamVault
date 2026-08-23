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
    IReadOnlyList<QuestionSqlTestCaseInput>? SqlTestCases = null);
