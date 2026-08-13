using OnlineExamSystem.Result.Application.Interfaces;

namespace OnlineExamSystem.Result.Application.Tests.Fakes;

public class FakeSubmissionLookupClient : ISubmissionLookupClient
{
    private readonly SubmissionLookupResult? _result;

    public FakeSubmissionLookupClient(SubmissionLookupResult? result)
    {
        _result = result;
    }

    public Task<SubmissionLookupResult?> GetMyAttemptAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) => Task.FromResult(_result);
}
