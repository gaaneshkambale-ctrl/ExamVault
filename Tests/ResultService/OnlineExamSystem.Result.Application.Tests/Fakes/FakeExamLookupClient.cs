using OnlineExamSystem.Result.Application.Interfaces;

namespace OnlineExamSystem.Result.Application.Tests.Fakes;

public class FakeExamLookupClient : IExamLookupClient
{
    private readonly ExamLookupResult? _result;
    private readonly bool _showCorrectAnswers;
    private readonly IReadOnlyList<SectionLookupResult> _sections;

    public FakeExamLookupClient(
        ExamLookupResult? result,
        bool showCorrectAnswers = true,
        IReadOnlyList<SectionLookupResult>? sections = null)
    {
        _result = result;
        _showCorrectAnswers = showCorrectAnswers;
        _sections = sections ?? [];
    }

    public Task<ExamLookupResult?> GetExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) => Task.FromResult(_result);

    public Task<bool> GetShowCorrectAnswersAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) => Task.FromResult(_showCorrectAnswers);

    public Task<IReadOnlyList<SectionLookupResult>> GetSectionsAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) => Task.FromResult(_sections);
}
