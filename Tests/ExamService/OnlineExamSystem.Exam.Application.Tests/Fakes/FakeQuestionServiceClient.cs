using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Tests.Fakes;

public class FakeQuestionServiceClient : IQuestionServiceClient
{
    public List<Guid> UnassignedSectionIds { get; } = [];
    public bool ThrowOnUnassign { get; set; }
    public Dictionary<Guid, int> QuestionCountsByExamId { get; } = [];
    public Dictionary<Guid, int> QuestionCountsBySectionId { get; } = [];
    public List<Guid> DeletedForExamIds { get; } = [];
    public bool ThrowOnDeleteForExam { get; set; }

    public Task UnassignSectionQuestionsAsync(
        Guid sectionId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        if (ThrowOnUnassign)
        {
            throw new HttpRequestException("Question Service unreachable.");
        }

        UnassignedSectionIds.Add(sectionId);
        return Task.CompletedTask;
    }

    public Task<int> GetQuestionCountAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(QuestionCountsByExamId.GetValueOrDefault(examId));

    public Task<IReadOnlyDictionary<Guid, int>> GetQuestionCountsBySectionAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyDictionary<Guid, int>>(QuestionCountsBySectionId);

    public Task DeleteQuestionsForExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        if (ThrowOnDeleteForExam)
        {
            throw new HttpRequestException("Question Service unreachable.");
        }

        DeletedForExamIds.Add(examId);
        return Task.CompletedTask;
    }
}
