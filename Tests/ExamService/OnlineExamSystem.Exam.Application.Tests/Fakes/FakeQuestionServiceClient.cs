using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Tests.Fakes;

public class FakeQuestionServiceClient : IQuestionServiceClient
{
    public List<Guid> UnassignedSectionIds { get; } = [];
    public bool ThrowOnUnassign { get; set; }

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
}
