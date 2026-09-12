using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Domain.Entities;

namespace OnlineExamSystem.Question.Application.Questions.ListAll;

// Super Admin platform-wide browse - relies on QuestionDbContext's existing
// IsSuperAdmin query-filter bypass on ExamQuestion for cross-tenant scoping.
public class ListAllQuestionsHandler
{
    private readonly IQuestionRepository _questionRepository;

    public ListAllQuestionsHandler(IQuestionRepository questionRepository)
    {
        _questionRepository = questionRepository;
    }

    public Task<IReadOnlyList<ExamQuestion>> HandleAsync(
        ListAllQuestionsQuery query,
        CancellationToken cancellationToken = default) =>
        _questionRepository.GetAllQuestionsAsync(cancellationToken);
}
