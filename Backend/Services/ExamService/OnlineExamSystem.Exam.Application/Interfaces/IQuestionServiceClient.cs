namespace OnlineExamSystem.Exam.Application.Interfaces;

public interface IQuestionServiceClient
{
    /// <summary>Clears SectionId back to null on every question currently assigned to this section -
    /// best-effort, called when a Section is deleted so its questions aren't orphaned or lost.</summary>
    Task UnassignSectionQuestionsAsync(
        Guid sectionId,
        string bearerToken,
        CancellationToken cancellationToken = default);

    /// <summary>The real question count for an exam, from Question Service - unlike
    /// ExamPaper.TotalQuestions (a legacy field never kept in sync), this reflects what's
    /// actually there. Used to block publishing an exam with none.</summary>
    Task<int> GetQuestionCountAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);

    /// <summary>Real question counts per section, from Question Service - a question created
    /// via AI-generation (or any other path) that never got assigned to a section (SectionId
    /// still null) doesn't count toward any section here, even though it counts toward
    /// GetQuestionCountAsync's exam-wide total. Used to catch a sectioned exam that looks
    /// publishable overall but has a section with nothing real a student could ever see.</summary>
    Task<IReadOnlyDictionary<Guid, int>> GetQuestionCountsBySectionAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);

    /// <summary>Deletes every question belonging to this exam - best-effort, called when the
    /// Exam itself is deleted so its questions aren't left orphaned (unlike a Section delete,
    /// there's no surviving exam left for them to be reassigned into).</summary>
    Task DeleteQuestionsForExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);
}
