namespace OnlineExamSystem.Exam.Application.Interfaces;

public interface IQuestionServiceClient
{
    /// <summary>Clears SectionId back to null on every question currently assigned to this section -
    /// best-effort, called when a Section is deleted so its questions aren't orphaned or lost.</summary>
    Task UnassignSectionQuestionsAsync(
        Guid sectionId,
        string bearerToken,
        CancellationToken cancellationToken = default);
}
