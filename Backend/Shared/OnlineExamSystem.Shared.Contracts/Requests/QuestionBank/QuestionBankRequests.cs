using OnlineExamSystem.Shared.Contracts.Requests.Question;

namespace OnlineExamSystem.Shared.Contracts.Requests.QuestionBank;

public record SaveBankSubjectRequest(string Name, string? Description = null);

public record SaveBankTopicRequest(Guid SubjectId, string Name);

public record SaveBankTagRequest(string Name);

public record BankQuestionOptionRequest(string OptionText, bool IsCorrect);

// Same body for create and update. Status is "Draft" | "Active" | "Archived".
public record SaveBankQuestionRequest(
    Guid SubjectId,
    Guid? TopicId,
    string QuestionType,
    string QuestionText,
    string Difficulty,
    int DefaultMarks,
    IReadOnlyList<BankQuestionOptionRequest> Options,
    string? Explanation = null,
    decimal NegativeMarks = 0,
    bool ShuffleOptions = false,
    string Status = "Draft",
    IReadOnlyList<Guid>? TagIds = null,
    // Code/Programming only - same flat shape as CreateQuestionRequest so the
    // frontend reuses its exam-question conversions.
    string? StarterCode = null,
    string? ProgrammingLanguage = null,
    bool AllowLanguageChange = false,
    string? SampleAnswer = null,
    string? FunctionName = null,
    string? ReturnType = null,
    IReadOnlyList<QuestionParameterRequest>? Parameters = null,
    IReadOnlyList<QuestionTestCaseRequest>? TestCases = null,
    IReadOnlyList<QuestionSqlTestCaseRequest>? SqlTestCases = null,
    string? SampleInput = null,
    string? SampleOutput = null,
    string? Constraints = null);
public record AddBankQuestionsToExamRequest(Guid ExamId, Guid? SectionId, IReadOnlyList<Guid> BankQuestionIds);
public record BulkBankStatusRequest(IReadOnlyList<Guid> Ids, string Status);

// "Draw Count random Active questions from this subject (optionally narrowed by
// topic / type / difficulty)". Type and Difficulty are the enum names.
public record RandomDrawRuleRequest(Guid SubjectId, Guid? TopicId, string? QuestionType, string? Difficulty, int Count);

public record RandomDrawPreviewRequest(Guid ExamId, IReadOnlyList<RandomDrawRuleRequest> Rules);

public record AddRandomBankQuestionsRequest(Guid ExamId, Guid? SectionId, IReadOnlyList<RandomDrawRuleRequest> Rules);
