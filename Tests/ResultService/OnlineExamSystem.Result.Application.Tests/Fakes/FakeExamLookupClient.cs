using OnlineExamSystem.Result.Application.Interfaces;

namespace OnlineExamSystem.Result.Application.Tests.Fakes;

public class FakeExamLookupClient : IExamLookupClient
{
    private readonly ExamLookupResult? _result;
    private readonly bool _showCorrectAnswers;

    public FakeExamLookupClient(ExamLookupResult? result, bool showCorrectAnswers = true)
    {
        _result = result;
        _showCorrectAnswers = showCorrectAnswers;
    }

    public Task<ExamLookupResult?> GetExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) => Task.FromResult(_result);

    public Task<bool> GetShowCorrectAnswersAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) => Task.FromResult(_showCorrectAnswers);
}
