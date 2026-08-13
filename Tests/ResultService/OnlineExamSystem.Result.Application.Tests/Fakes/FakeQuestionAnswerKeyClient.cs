using OnlineExamSystem.Result.Application.Interfaces;

namespace OnlineExamSystem.Result.Application.Tests.Fakes;

public class FakeQuestionAnswerKeyClient : IQuestionAnswerKeyClient
{
    private readonly IReadOnlyList<AnswerKeyQuestion> _answerKey;

    public FakeQuestionAnswerKeyClient(IReadOnlyList<AnswerKeyQuestion> answerKey)
    {
        _answerKey = answerKey;
    }

    public Task<IReadOnlyList<AnswerKeyQuestion>> GetAnswerKeyAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) => Task.FromResult(_answerKey);
}
