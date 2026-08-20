using Microsoft.Extensions.Logging;
using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Sections.Delete;

public class DeleteSectionHandler
{
    private readonly IExamRepository _examRepository;
    private readonly IQuestionServiceClient _questionServiceClient;
    private readonly ILogger<DeleteSectionHandler> _logger;

    public DeleteSectionHandler(
        IExamRepository examRepository,
        IQuestionServiceClient questionServiceClient,
        ILogger<DeleteSectionHandler> logger)
    {
        _examRepository = examRepository;
        _questionServiceClient = questionServiceClient;
        _logger = logger;
    }

    public async Task<DeleteSectionResult> HandleAsync(
        DeleteSectionCommand command,
        CancellationToken cancellationToken = default)
    {
        var removed = await _examRepository.RemoveSectionAsync(command.SectionId, cancellationToken);
        if (!removed)
        {
            return DeleteSectionResult.NotFound();
        }

        await _examRepository.SaveChangesAsync(cancellationToken);

        try
        {
            // Best-effort, same principle as CreateAssignmentHandler's event publish - the
            // section is already durably deleted, a Question Service hiccup here must not
            // fail the whole operation nor mislead the Admin into retrying.
            await _questionServiceClient.UnassignSectionQuestionsAsync(
                command.SectionId,
                command.BearerToken,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to unassign questions for deleted section {SectionId}.", command.SectionId);
        }

        return DeleteSectionResult.Ok();
    }
}
