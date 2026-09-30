using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Question.Domain.Enums;

namespace OnlineExamSystem.Question.Application.Interfaces;

public record BankQuestionFilter(
    string? Search,
    Guid? SubjectId,
    Guid? TopicId,
    QuestionType? QuestionType,
    QuestionDifficulty? Difficulty,
    BankQuestionStatus? Status,
    Guid? TagId,
    Guid? CreatedByUserId,
    int Page,
    int PageSize,
    // When set, each returned item also reports whether it is already in this exam (picker "Added" state).
    Guid? ExamId = null);

public record BankQuestionAggregate(
    BankQuestion Question,
    IReadOnlyList<BankQuestionOption> Options,
    IReadOnlyList<BankTag> Tags,
    // Exam questions copied from this bank question (any exam in the tenant).
    int UsageCount = 0,
    bool InExam = false);

// One bank question turned into the rows an exam question needs (children empty for non-code types).
public record ExamCopy(
    ExamQuestion Question,
    IReadOnlyList<QuestionOption> Options,
    IReadOnlyList<QuestionParameter> Parameters,
    IReadOnlyList<QuestionTestCase> TestCases,
    IReadOnlyList<QuestionSqlTestCase> SqlTestCases);

public record BankQuestionPage(IReadOnlyList<BankQuestionAggregate> Items, int Total);

// All reads are tenant-scoped by QuestionDbContext's query filters; writes
// stamp TenantId in SaveChanges. Nothing here takes a tenant id.
public interface IQuestionBankRepository
{
    Task<IReadOnlyList<(BankSubject Subject, int TopicCount, int QuestionCount)>> ListSubjectsAsync(CancellationToken ct);
    Task<BankSubject?> GetSubjectAsync(Guid id, CancellationToken ct);
    Task<bool> SubjectNameExistsAsync(string name, Guid? excludeId, CancellationToken ct);
    Task AddSubjectAsync(BankSubject subject, CancellationToken ct);
    Task<bool> SubjectHasDependentsAsync(Guid id, CancellationToken ct);
    void RemoveSubject(BankSubject subject);

    Task<IReadOnlyList<(BankTopic Topic, int QuestionCount)>> ListTopicsAsync(Guid? subjectId, CancellationToken ct);
    Task<BankTopic?> GetTopicAsync(Guid id, CancellationToken ct);
    Task<bool> TopicNameExistsAsync(Guid subjectId, string name, Guid? excludeId, CancellationToken ct);
    Task AddTopicAsync(BankTopic topic, CancellationToken ct);
    Task<bool> TopicHasQuestionsAsync(Guid id, CancellationToken ct);
    void RemoveTopic(BankTopic topic);

    Task<IReadOnlyList<(BankTag Tag, int QuestionCount)>> ListTagsAsync(CancellationToken ct);
    Task<BankTag?> GetTagAsync(Guid id, CancellationToken ct);
    Task<bool> TagNameExistsAsync(string name, CancellationToken ct);
    Task<int> CountExistingTagsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct);
    Task AddTagAsync(BankTag tag, CancellationToken ct);
    Task RemoveTagAsync(BankTag tag, CancellationToken ct);

    Task<BankQuestionPage> ListQuestionsAsync(BankQuestionFilter filter, CancellationToken ct);
    Task<BankQuestion?> GetQuestionAsync(Guid id, CancellationToken ct);
    // Tracked entities, for bulk edits.
    Task<IReadOnlyList<BankQuestion>> GetQuestionsByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct);
    Task<BankQuestionAggregate?> GetQuestionAggregateAsync(Guid id, CancellationToken ct);
    Task AddQuestionAsync(BankQuestion question, IReadOnlyList<BankQuestionOption> options, IReadOnlyCollection<Guid> tagIds, CancellationToken ct);
    // Replaces options + tag links wholesale; the question row itself is already tracked.
    Task ReplaceQuestionChildrenAsync(Guid questionId, IReadOnlyList<BankQuestionOption> options, IReadOnlyCollection<Guid> tagIds, CancellationToken ct);
    void RemoveQuestion(BankQuestion question);

    Task<IReadOnlyList<BankQuestionAggregate>> GetAggregatesByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct);
    Task<HashSet<Guid>> GetBankIdsAlreadyInExamAsync(Guid examId, IReadOnlyCollection<Guid> bankQuestionIds, CancellationToken ct);
    Task AddExamCopiesAsync(IReadOnlyList<ExamCopy> copies, CancellationToken ct);
    // Ids of ACTIVE bank questions matching the filters that are NOT already in the exam (the
    // anti-join runs in SQL, so a big bank never needs a giant id list sent to the database).
    Task<IReadOnlyList<Guid>> GetRandomCandidateIdsAsync(
        Guid examId, Guid subjectId, Guid? topicId, QuestionType? questionType, QuestionDifficulty? difficulty, CancellationToken ct);

    Task SaveChangesAsync(CancellationToken ct);
}
