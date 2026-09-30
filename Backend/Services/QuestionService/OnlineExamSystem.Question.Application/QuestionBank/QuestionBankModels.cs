using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Question.Domain.Enums;

namespace OnlineExamSystem.Question.Application.QuestionBank;

public enum BankOutcome { Ok, NotFound, Forbidden, Conflict, Invalid }

public record BankResult<T>(BankOutcome Outcome, T? Value = default, IReadOnlyList<string>? Errors = null)
{
    public static BankResult<T> Ok(T value) => new(BankOutcome.Ok, value);
    public static BankResult<T> NotFound() => new(BankOutcome.NotFound);
    public static BankResult<T> Forbidden() => new(BankOutcome.Forbidden);
    public static BankResult<T> Conflict(string error) => new(BankOutcome.Conflict, default, [error]);
    public static BankResult<T> Invalid(IReadOnlyList<string> errors) => new(BankOutcome.Invalid, default, errors);
}

// Who is calling. Instructors may edit only their own questions; Admins any.
public record BankCaller(Guid UserId, bool IsAdmin);

public record SaveBankQuestionCommand(
    Guid SubjectId,
    Guid? TopicId,
    string QuestionType,
    string QuestionText,
    string? Explanation,
    string Difficulty,
    int DefaultMarks,
    decimal NegativeMarks,
    bool ShuffleOptions,
    string Status,
    IReadOnlyList<BankOptionInput> Options,
    IReadOnlyList<Guid> TagIds,
    // CodeProgram only.
    BankCodeSpec? Code = null,
    // Forwarded to Execution Service to precompute Sql expected output (best-effort), same as exam questions.
    string? BearerToken = null);

public record BankOptionInput(string Text, bool IsCorrect);

public record BankSubjectView(BankSubject Subject, int TopicCount, int QuestionCount);
public record BankTopicView(BankTopic Topic, int QuestionCount);
public record BankTagView(BankTag Tag, int QuestionCount);

public record SkippedBankQuestion(Guid BankQuestionId, string Reason);

public record AddToExamResult(int Added, IReadOnlyList<SkippedBankQuestion> Skipped, IReadOnlyList<Guid> CreatedQuestionIds);

public record SkippedBankStatusChange(Guid BankQuestionId, string Reason);

public record BulkStatusResult(int Updated, IReadOnlyList<SkippedBankStatusChange> Skipped);

// One "draw N random questions matching these filters" rule. Subject is required
// (a bank question always has one); topic/type/difficulty narrow it further.
public record RandomDrawRule(Guid SubjectId, Guid? TopicId, QuestionType? QuestionType, QuestionDifficulty? Difficulty, int Count);

public record RandomRuleAvailability(int Requested, int Available);
