using Microsoft.Extensions.Logging;
using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Exams.Delete;

public class DeleteExamHandler
{
    private readonly IExamRepository _examRepository;
    private readonly IQuestionServiceClient _questionServiceClient;
    private readonly ILogger<DeleteExamHandler> _logger;

    public DeleteExamHandler(
        IExamRepository examRepository,
        IQuestionServiceClient questionServiceClient,
        ILogger<DeleteExamHandler> logger)
    {
        _examRepository = examRepository;
        _questionServiceClient = questionServiceClient;
        _logger = logger;
    }

    public async Task<DeleteExamResult> HandleAsync(
        DeleteExamCommand command,
        CancellationToken cancellationToken = default)
    {
        var exam = await _examRepository.GetByIdAsync(command.ExamId, cancellationToken);
        if (exam is null)
        {
            return DeleteExamResult.NotFound();
        }

        await _examRepository.RemoveAsync(exam, cancellationToken);
        await _examRepository.SaveChangesAsync(cancellationToken);

        try
        {
            // Best-effort, same principle as DeleteSectionHandler's own call - the exam is
            // already durably deleted, a Question Service hiccup here must not fail the
            // whole operation nor mislead the Admin into retrying.
            await _questionServiceClient.DeleteQuestionsForExamAsync(
                command.ExamId,
                command.BearerToken,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete questions for deleted exam {ExamId}.", command.ExamId);
        }

        return DeleteExamResult.Ok(exam.TenantId, exam.Title);
    }
}
