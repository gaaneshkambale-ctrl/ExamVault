using OnlineExamSystem.Question.Application.Interfaces;

namespace OnlineExamSystem.Question.Application.Questions.UnassignSection;

public class UnassignSectionHandler
{
    private readonly IQuestionRepository _questionRepository;

    public UnassignSectionHandler(IQuestionRepository questionRepository)
    {
        _questionRepository = questionRepository;
    }

    public async Task HandleAsync(UnassignSectionCommand command, CancellationToken cancellationToken = default)
    {
        await _questionRepository.UnassignAllQuestionsInSectionAsync(command.SectionId, cancellationToken);
        await _questionRepository.SaveChangesAsync(cancellationToken);
    }
}
