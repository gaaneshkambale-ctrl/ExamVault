using OnlineExamSystem.Exam.Application.Interfaces;
using ProctoringSettingsEntity = OnlineExamSystem.Exam.Domain.Entities.ProctoringSettings;

namespace OnlineExamSystem.Exam.Application.Proctoring.GetProctoringSettings;

public class GetProctoringSettingsHandler
{
    private readonly IExamRepository _examRepository;

    public GetProctoringSettingsHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public Task<ProctoringSettingsEntity> HandleAsync(
        GetProctoringSettingsQuery query,
        CancellationToken cancellationToken = default) =>
        _examRepository.GetOrCreateProctoringSettingsAsync(cancellationToken);
}
