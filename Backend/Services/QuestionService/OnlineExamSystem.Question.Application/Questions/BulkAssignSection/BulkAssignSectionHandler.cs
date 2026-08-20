using OnlineExamSystem.Question.Application.Interfaces;

namespace OnlineExamSystem.Question.Application.Questions.BulkAssignSection;

public class BulkAssignSectionHandler
{
    private readonly IQuestionRepository _questionRepository;

    public BulkAssignSectionHandler(IQuestionRepository questionRepository)
    {
        _questionRepository = questionRepository;
    }

    public async Task HandleAsync(BulkAssignSectionCommand command, CancellationToken cancellationToken = default)
    {
        if (command.QuestionIds.Count == 0)
        {
            return;
        }

        await _questionRepository.BulkSetSectionIdAsync(command.SectionId, command.QuestionIds, cancellationToken);
        await _questionRepository.SaveChangesAsync(cancellationToken);
    }
}
