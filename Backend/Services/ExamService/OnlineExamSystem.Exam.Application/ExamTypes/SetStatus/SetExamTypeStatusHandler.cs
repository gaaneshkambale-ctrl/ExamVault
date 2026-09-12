using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.ExamTypes.SetStatus;

public class SetExamTypeStatusHandler
{
    private readonly IExamRepository _examRepository;

    public SetExamTypeStatusHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<SetExamTypeStatusResult> HandleAsync(
        SetExamTypeStatusCommand command,
        CancellationToken cancellationToken = default)
    {
        var examType = await _examRepository.GetExamTypeByIdAsync(command.ExamTypeId, cancellationToken);
        if (examType is null)
        {
            return SetExamTypeStatusResult.NotFound();
        }

        examType.IsActive = command.IsActive;
        await _examRepository.SaveChangesAsync(cancellationToken);

        return SetExamTypeStatusResult.Ok(examType);
    }
}
