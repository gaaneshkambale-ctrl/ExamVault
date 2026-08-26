using OnlineExamSystem.Exam.Application.Interfaces;
using ExamDefaultsEntity = OnlineExamSystem.Exam.Domain.Entities.ExamDefaults;

namespace OnlineExamSystem.Exam.Application.Settings.GetExamDefaults;

public class GetExamDefaultsHandler
{
    private readonly IExamRepository _examRepository;

    public GetExamDefaultsHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public Task<ExamDefaultsEntity> HandleAsync(
        GetExamDefaultsQuery query,
        CancellationToken cancellationToken = default) =>
        _examRepository.GetOrCreateExamDefaultsAsync(cancellationToken);
}
