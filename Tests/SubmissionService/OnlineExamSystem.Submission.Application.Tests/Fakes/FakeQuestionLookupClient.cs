using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Application.Tests.Fakes;

public class FakeQuestionLookupClient : IQuestionLookupClient
{
    private readonly IReadOnlyList<QuestionLookupResult> _questions;

    public FakeQuestionLookupClient(IReadOnlyList<QuestionLookupResult>? questions = null)
    {
        _questions = questions ?? [];
    }

    public Task<IReadOnlyList<QuestionLookupResult>> GetQuestionsAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_questions);
}
