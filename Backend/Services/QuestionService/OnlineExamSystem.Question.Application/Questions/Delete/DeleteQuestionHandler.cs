using OnlineExamSystem.Question.Application.Interfaces;

namespace OnlineExamSystem.Question.Application.Questions.Delete;

public class DeleteQuestionHandler
{
    private readonly IQuestionRepository _questionRepository;

    public DeleteQuestionHandler(IQuestionRepository questionRepository)
    {
        _questionRepository = questionRepository;
    }

    public async Task<DeleteQuestionResult> HandleAsync(
        DeleteQuestionCommand command,
        CancellationToken cancellationToken = default)
    {
        var question = await _questionRepository.GetQuestionByIdAsync(command.QuestionId, cancellationToken);
        if (question is null)
        {
            return DeleteQuestionResult.NotFound();
        }

        await _questionRepository.RemoveQuestionAsync(question, cancellationToken);
        await _questionRepository.SaveChangesAsync(cancellationToken);

        return DeleteQuestionResult.Ok();
    }
}
