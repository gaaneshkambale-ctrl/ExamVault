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

        if (query.OwnerUserId is { } ownerUserId)
        {
            questions = questions.Where(q => q.CreatedByUserId == ownerUserId).ToList();
        }

        if (questions.Count == 0)
        {
            return [];
        }

        var questionIds = questions.Select(q => q.Id).ToList();
        var options = await _questionRepository.GetOptionsByQuestionIdsAsync(questionIds, cancellationToken);
        var optionsByQuestionId = options.ToLookup(o => o.QuestionId);
        var parameters = await _questionRepository.GetParametersByQuestionIdsAsync(questionIds, cancellationToken);
        var parametersByQuestionId = parameters.ToLookup(p => p.QuestionId);
        var testCases = await _questionRepository.GetTestCasesByQuestionIdsAsync(questionIds, cancellationToken);
        var testCasesByQuestionId = testCases.ToLookup(t => t.QuestionId);
        var sqlTestCases = await _questionRepository.GetSqlTestCasesByQuestionIdsAsync(questionIds, cancellationToken);
        var sqlTestCasesByQuestionId = sqlTestCases.ToLookup(t => t.QuestionId);

        return questions
            .Select(q => new QuestionWithOptions(
                q,
                optionsByQuestionId[q.Id].ToList(),
                parametersByQuestionId[q.Id].ToList(),
                testCasesByQuestionId[q.Id].ToList(),
                sqlTestCasesByQuestionId[q.Id].ToList()))
            .ToList();
    }
}
