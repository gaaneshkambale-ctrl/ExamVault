using OnlineExamSystem.Shared.Contracts.Responses.Question;

namespace OnlineExamSystem.Shared.Contracts.Responses.QuestionBank;

public record BankSubjectResponse(Guid Id, string Name, string? Description, int TopicCount, int QuestionCount, DateTime CreatedAtUtc);

public record BankTopicResponse(Guid Id, Guid SubjectId, string Name, int QuestionCount, DateTime CreatedAtUtc);

public record BankTagResponse(Guid Id, string Name, int QuestionCount, DateTime CreatedAtUtc);

public record BankQuestionOptionResponse(Guid Id, string OptionText, bool IsCorrect, int DisplayOrder);

public record BankQuestionResponse(
    Guid Id,
    Guid SubjectId,
    string SubjectName,
    Guid? TopicId,
    string? TopicName,
    string QuestionType,
    string QuestionText,
    string? Explanation,
    string Difficulty,
    int DefaultMarks,
    decimal NegativeMarks,
    bool ShuffleOptions,
    string Status,
    IReadOnlyList<BankQuestionOptionResponse> Options,
    IReadOnlyList<BankTagResponse> Tags,
    Guid CreatedByUserId,
    string? CreatedByName,
    DateTime CreatedAtUtc,
    Guid? UpdatedByUserId,
    DateTime? UpdatedAtUtc,
    // Exam questions copied from this bank question, across the tenant.
    int UsageCount = 0,
    // Only meaningful when the list was requested with an examId: already copied into that exam.
    bool InExam = false,
    // Code/Programming only (null otherwise) - same shapes as QuestionResponse.
    string? StarterCode = null,
    string? ProgrammingLanguage = null,
    bool AllowLanguageChange = false,
    string? SampleAnswer = null,
    string? FunctionName = null,
    string? ReturnType = null,
    IReadOnlyList<QuestionParameterResponse>? Parameters = null,
    IReadOnlyList<QuestionTestCaseResponse>? TestCases = null,
    IReadOnlyList<QuestionSqlTestCaseResponse>? SqlTestCases = null,
    string? SampleInput = null,
    string? SampleOutput = null,
    string? Constraints = null);

public record BankQuestionPageResponse(IReadOnlyList<BankQuestionResponse> Items, int Total, int Page, int PageSize);

public record SkippedBankQuestionResponse(Guid BankQuestionId, string Reason);

public record AddBankQuestionsToExamResponse(int Added, IReadOnlyList<SkippedBankQuestionResponse> Skipped, IReadOnlyList<Guid> CreatedQuestionIds);

public record SkippedBankStatusChangeResponse(Guid BankQuestionId, string Reason);

public record BulkBankStatusResponse(int Updated, IReadOnlyList<SkippedBankStatusChangeResponse> Skipped);

public record RandomRuleAvailabilityResponse(int Requested, int Available);
