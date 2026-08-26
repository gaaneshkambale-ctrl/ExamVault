using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Application.Tests.Fakes;

public class FakeAssignmentLookupClient : IAssignmentLookupClient
{
    private readonly AssignmentLookupResult? _result;

    public FakeAssignmentLookupClient(AssignmentLookupResult? result = null)
    {
        _result = result;
    }

    public Task<AssignmentLookupResult?> GetMyAssignmentAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_result);
}
