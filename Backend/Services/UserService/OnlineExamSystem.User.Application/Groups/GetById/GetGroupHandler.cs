using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Groups.GetById;

public class GetGroupHandler
{
    private readonly IGroupRepository _groupRepository;

    public GetGroupHandler(IGroupRepository groupRepository)
    {
        _groupRepository = groupRepository;
    }

    public async Task<GroupDetail?> HandleAsync(GetGroupQuery query, CancellationToken cancellationToken = default)
    {
        var group = await _groupRepository.GetByIdAsync(query.Id, cancellationToken);
        if (group is null)
        {
            return null;
        }

        var memberUserIds = await _groupRepository.GetMemberUserIdsAsync(group.Id, cancellationToken);
        return new GroupDetail(group, memberUserIds);
    }
}
