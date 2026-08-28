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
}
