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

        var options = await _questionRepository.GetOptionsByQuestionIdAsync(question.Id, cancellationToken);
        return new QuestionWithOptions(question, options);
    }
}
