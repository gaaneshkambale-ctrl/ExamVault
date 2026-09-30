using OnlineExamSystem.Question.Application.Interfaces;

namespace OnlineExamSystem.Question.Application.Questions.TenantCounts;

// Super Admin only: how many questions each organization has - in its exams
// and in its Question Bank. Counts only, never question content, so the
// platform console can show usage without any cross-tenant browse of questions.
// Relies on QuestionDbContext's IsSuperAdmin query-filter bypass for scoping.
public class GetTenantQuestionCountsHandler
{
    private readonly IQuestionRepository _questionRepository;

    public GetTenantQuestionCountsHandler(IQuestionRepository questionRepository)
    {
        _questionRepository = questionRepository;
    }

    public Task<IReadOnlyList<TenantQuestionCount>> HandleAsync(CancellationToken cancellationToken = default) =>
        _questionRepository.GetQuestionCountsByTenantAsync(cancellationToken);
}
