using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Rules;

namespace OnlineExamSystem.Exam.Application.Exams.ChangeStatus;

public class ChangeExamStatusHandler
{
    private readonly IExamRepository _examRepository;

    public ChangeExamStatusHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<ChangeExamStatusResult> HandleAsync(
        ChangeExamStatusCommand command,
        CancellationToken cancellationToken = default)
    {
        var exam = await _examRepository.GetByIdAsync(command.ExamId, cancellationToken);
        if (exam is null)
        {
            return ChangeExamStatusResult.NotFound();
        }

        if (!ExamStatusTransitions.CanTransition(exam.Status, command.TargetStatus))
        {
            return ChangeExamStatusResult.Invalid();
        }

        exam.Status = command.TargetStatus;
        await _examRepository.SaveChangesAsync(cancellationToken);

        return ChangeExamStatusResult.Ok(exam);
    }
}
