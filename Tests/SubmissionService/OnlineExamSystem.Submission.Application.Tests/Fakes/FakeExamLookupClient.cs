using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Application.Tests.Fakes;

public class FakeExamLookupClient : IExamLookupClient
{
    private readonly ExamLookupResult? _result;
    private readonly IReadOnlyList<SectionLookupResult> _sections;

    public FakeExamLookupClient(ExamLookupResult? result, IReadOnlyList<SectionLookupResult>? sections = null)
    {
        _result = result;
        _sections = sections ?? [];
    }

    public Task<ExamLookupResult?> GetExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_result);

    public Task<IReadOnlyList<SectionLookupResult>> GetSectionsAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_sections);
}
