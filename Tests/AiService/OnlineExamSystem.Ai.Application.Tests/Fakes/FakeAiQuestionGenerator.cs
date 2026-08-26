using OnlineExamSystem.Ai.Application.Generate;
using OnlineExamSystem.Ai.Application.Interfaces;
using OnlineExamSystem.Ai.Domain;

namespace OnlineExamSystem.Ai.Application.Tests.Fakes;

public class FakeAiQuestionGenerator : IAiQuestionGenerator
{
    private readonly IReadOnlyList<DraftQuestion> _drafts;
    private readonly Exception? _exceptionToThrow;

    public int CallCount { get; private set; }

    public FakeAiQuestionGenerator(IReadOnlyList<DraftQuestion>? drafts = null, Exception? exceptionToThrow = null)
    {
        _drafts = drafts ?? [];
        _exceptionToThrow = exceptionToThrow;
    }

    public Task<IReadOnlyList<DraftQuestion>> GenerateAsync(
        GenerateQuestionsRequest request,
        CancellationToken cancellationToken = default)
    {
        CallCount++;
        if (_exceptionToThrow is not null)
        {
            throw _exceptionToThrow;
        }

        return Task.FromResult(_drafts);
    }
}
