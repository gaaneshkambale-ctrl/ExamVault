namespace OnlineExamSystem.Submission.Application.Interfaces;

// Only the fields SaveAnswerHandler needs to enforce Sequential/Locked
// navigation server-side: which section a question belongs to, and its
// canonical (unshuffled) creation order within that section.
public record QuestionLookupResult(Guid QuestionId, Guid? SectionId, DateTime CreatedOn);

public interface IQuestionLookupClient
{
    Task<IReadOnlyList<QuestionLookupResult>> GetQuestionsAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default);
}
