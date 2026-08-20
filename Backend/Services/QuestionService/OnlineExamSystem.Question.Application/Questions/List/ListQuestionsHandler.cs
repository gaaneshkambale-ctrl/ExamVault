using OnlineExamSystem.Question.Application.Interfaces;

namespace OnlineExamSystem.Question.Application.Questions.List;

public class ListQuestionsHandler
{
    private readonly IQuestionRepository _questionRepository;

    public ListQuestionsHandler(IQuestionRepository questionRepository)
    {
        _questionRepository = questionRepository;
    }

    public async Task<IReadOnlyList<QuestionWithOptions>> HandleAsync(
        ListQuestionsQuery query,
        CancellationToken cancellationToken = default)
    {
        var questions = await _questionRepository.GetQuestionsByExamIdAsync(
            query.ExamId,
            query.SectionId,
            query.UnassignedOnly,
            cancellationToken);
        if (questions.Count == 0)
        {
            return [];
        }

        var options = await _questionRepository.GetOptionsByQuestionIdsAsync(
            questions.Select(q => q.Id).ToList(),
            cancellationToken);
        var optionsByQuestionId = options.ToLookup(o => o.QuestionId);

        return questions
            .Select(q => new QuestionWithOptions(q, optionsByQuestionId[q.Id].ToList()))
            .ToList();
    }
}
