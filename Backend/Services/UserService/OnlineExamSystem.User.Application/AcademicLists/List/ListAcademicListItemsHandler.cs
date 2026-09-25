using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.AcademicLists.List;

public class ListAcademicListItemsHandler
{
    private readonly IAcademicListItemRepository _repository;

    public ListAcademicListItemsHandler(IAcademicListItemRepository repository)
    {
        _repository = repository;
    }

    public Task<List<AcademicListItem>> HandleAsync(
        ListAcademicListItemsQuery query,
        CancellationToken cancellationToken = default) =>
        _repository.GetAsync(query.ListType, query.ParentId, cancellationToken);
}
