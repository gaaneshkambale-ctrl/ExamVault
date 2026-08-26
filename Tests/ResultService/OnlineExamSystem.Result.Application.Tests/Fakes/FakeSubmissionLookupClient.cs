using OnlineExamSystem.Result.Application.Interfaces;

namespace OnlineExamSystem.Result.Application.Tests.Fakes;

public class FakeSubmissionLookupClient : ISubmissionLookupClient
{
    private readonly SubmissionLookupResult? _result;
    private readonly IReadOnlyList<SubmissionLookupResult>? _attemptsByExam;
    private readonly Exception? _exceptionToThrow;

    public FakeSubmissionLookupClient(SubmissionLookupResult? result, Exception? exceptionToThrow = null)
    {
        _result = result;
        _exceptionToThrow = exceptionToThrow;
    }

    public FakeSubmissionLookupClient(
        IReadOnlyList<SubmissionLookupResult> attemptsByExam,
        Exception? exceptionToThrow = null)
    {
        _attemptsByExam = attemptsByExam;
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

    public Task<IReadOnlyList<SubmissionLookupResult>> GetAttemptsByExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        if (_exceptionToThrow is not null)
        {
            throw _exceptionToThrow;
        }

        IReadOnlyList<SubmissionLookupResult> results =
            _attemptsByExam ?? (_result is null ? [] : [_result]);
        return Task.FromResult(results);
    }
}
