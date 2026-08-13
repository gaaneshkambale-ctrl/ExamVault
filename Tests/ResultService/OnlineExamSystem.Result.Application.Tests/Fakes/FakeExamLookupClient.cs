using OnlineExamSystem.Result.Application.Interfaces;

namespace OnlineExamSystem.Result.Application.Tests.Fakes;

public class FakeExamLookupClient : IExamLookupClient
{
    private readonly ExamLookupResult? _result;

    public FakeExamLookupClient(ExamLookupResult? result)
    {
        _result = result;
    }

    public Task<ExamLookupResult?> GetExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) => Task.FromResult(_result);
}
