using OnlineExamSystem.Result.Application.Interfaces;

namespace OnlineExamSystem.Result.Application.Tests.Fakes;

public class FakeSubmissionLookupClient : ISubmissionLookupClient
{
    private readonly SubmissionLookupResult? _result;
    private readonly Exception? _exceptionToThrow;

    public FakeSubmissionLookupClient(SubmissionLookupResult? result, Exception? exceptionToThrow = null)
    {
        _result = result;
        _exceptionToThrow = exceptionToThrow;
    }

    public Task<SubmissionLookupResult?> GetMyAttemptAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        if (_exceptionToThrow is not null)
        {
            throw _exceptionToThrow;
        }

        return Task.FromResult(_result);
    }
}
