using OnlineExamSystem.Question.Domain.Entities;

namespace OnlineExamSystem.Question.Application.Interfaces;

public interface IQuestionRepository
{
    Task AddAsync(
        ExamQuestion question,
        IReadOnlyList<QuestionOption> options,
        IReadOnlyList<QuestionParameter>? parameters = null,
        IReadOnlyList<QuestionTestCase>? testCases = null,
        IReadOnlyList<QuestionSqlTestCase>? sqlTestCases = null,
        CancellationToken cancellationToken = default);

    Task<ExamQuestion?> GetQuestionByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<QuestionOption>> GetOptionsByQuestionIdAsync(
        Guid questionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ExamQuestion>> GetQuestionsByExamIdAsync(
        Guid examId,
        Guid? sectionId = null,
        bool unassignedOnly = false,
        CancellationToken cancellationToken = default);

    /// <summary>Every question across every tenant/exam - Super Admin platform-wide
    /// browse only. Relies on QuestionDbContext's own IsSuperAdmin query-filter bypass
    /// for cross-tenant scoping. No exam titles here - QuestionService has no Exams
    /// table of its own (different database/service); the frontend joins ExamId
    /// against the platform's own already-fetched cross-tenant exam list instead.</summary>
    Task<IReadOnlyList<ExamQuestion>> GetAllQuestionsAsync(CancellationToken cancellationToken = default);

    /// <summary>Sets SectionId on every given question. Pass a null sectionId to unassign.</summary>
    Task BulkSetSectionIdAsync(
        Guid? sectionId,
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default);

    /// <summary>Clears SectionId back to null on every question currently assigned to this section.</summary>
    Task UnassignAllQuestionsInSectionAsync(Guid sectionId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<QuestionOption>> GetOptionsByQuestionIdsAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default);

    Task AddOptionsAsync(IReadOnlyList<QuestionOption> options, CancellationToken cancellationToken = default);

    Task RemoveOptionsByQuestionIdAsync(Guid questionId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<QuestionParameter>> GetParametersByQuestionIdAsync(
        Guid questionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<QuestionParameter>> GetParametersByQuestionIdsAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default);

    Task AddParametersAsync(IReadOnlyList<QuestionParameter> parameters, CancellationToken cancellationToken = default);

    Task RemoveParametersByQuestionIdAsync(Guid questionId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<QuestionTestCase>> GetTestCasesByQuestionIdAsync(
        Guid questionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<QuestionTestCase>> GetTestCasesByQuestionIdsAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default);

    Task AddTestCasesAsync(IReadOnlyList<QuestionTestCase> testCases, CancellationToken cancellationToken = default);

    Task RemoveTestCasesByQuestionIdAsync(Guid questionId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<QuestionSqlTestCase>> GetSqlTestCasesByQuestionIdAsync(
        Guid questionId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<QuestionSqlTestCase>> GetSqlTestCasesByQuestionIdsAsync(
        IReadOnlyList<Guid> questionIds,
        CancellationToken cancellationToken = default);

    Task AddSqlTestCasesAsync(
        IReadOnlyList<QuestionSqlTestCase> sqlTestCases,
        CancellationToken cancellationToken = default);

    Task RemoveSqlTestCasesByQuestionIdAsync(Guid questionId, CancellationToken cancellationToken = default);

    Task RemoveQuestionAsync(ExamQuestion question, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
