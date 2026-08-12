using OnlineExamSystem.Ai.Application.Generate;
using OnlineExamSystem.Ai.Domain;

namespace OnlineExamSystem.Ai.Application.Interfaces;

public interface IAiQuestionGenerator
{
    Task<IReadOnlyList<DraftQuestion>> GenerateAsync(
        GenerateQuestionsRequest request,
        CancellationToken cancellationToken = default);
}
