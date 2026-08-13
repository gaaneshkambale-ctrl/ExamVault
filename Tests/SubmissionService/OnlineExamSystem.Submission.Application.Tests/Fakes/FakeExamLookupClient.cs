using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Application.Tests.Fakes;

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
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_result);
}
