using OnlineExamSystem.Question.Application.Interfaces;

namespace OnlineExamSystem.Question.Application.Questions.GetById;

public class GetQuestionHandler
{
    private readonly IQuestionRepository _questionRepository;

    public GetQuestionHandler(IQuestionRepository questionRepository)
    {
        _questionRepository = questionRepository;
    }

    public async Task<QuestionWithOptions?> HandleAsync(
        GetQuestionQuery query,
        CancellationToken cancellationToken = default)
    {
        var question = await _questionRepository.GetQuestionByIdAsync(query.Id, cancellationToken);
        if (question is null)
        {
            return null;
        }

        // Deliberately not distinguishing "doesn't exist" from "not yours" -
        // both look like a 404 to an Instructor who doesn't own this question.
        if (query.OwnerUserId is { } ownerUserId && question.CreatedByUserId != ownerUserId)
        {
            return null;
        }

        var options = await _questionRepository.GetOptionsByQuestionIdAsync(question.Id, cancellationToken);
        var parameters = await _questionRepository.GetParametersByQuestionIdAsync(question.Id, cancellationToken);
        var testCases = await _questionRepository.GetTestCasesByQuestionIdAsync(question.Id, cancellationToken);
        var sqlTestCases = await _questionRepository.GetSqlTestCasesByQuestionIdAsync(question.Id, cancellationToken);
        return new QuestionWithOptions(question, options, parameters, testCases, sqlTestCases);
    }
}
