using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Plans.List;

public class ListPlansHandler
{
    private readonly IPlanRepository _planRepository;

    public ListPlansHandler(IPlanRepository planRepository)
    {
        _planRepository = planRepository;
    }

    public Task<IReadOnlyList<Plan>> HandleAsync(ListPlansQuery query, CancellationToken cancellationToken = default) =>
        _planRepository.GetAllAsync(cancellationToken);
}
