using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Groups.List;

public class ListGroupsHandler
{
    private readonly IGroupRepository _groupRepository;

    public ListGroupsHandler(IGroupRepository groupRepository)
    {
        _groupRepository = groupRepository;
    }

    public Task<IReadOnlyList<GroupWithMemberCount>> HandleAsync(
        ListGroupsQuery query,
        CancellationToken cancellationToken = default) =>
        _groupRepository.GetAllWithMemberCountsAsync(cancellationToken);
}
