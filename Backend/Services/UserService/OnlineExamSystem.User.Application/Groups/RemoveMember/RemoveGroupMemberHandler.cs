using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Groups.RemoveMember;

public class RemoveGroupMemberHandler
{
    private readonly IGroupRepository _groupRepository;

    public RemoveGroupMemberHandler(IGroupRepository groupRepository)
    {
        _groupRepository = groupRepository;
    }

    public async Task<RemoveGroupMemberResult> HandleAsync(
        RemoveGroupMemberCommand command,
        CancellationToken cancellationToken = default)
    {
        // GroupMember rows carry no TenantId/query filter of their own - they're
        // only tenant-scoped transitively through their owning Group. Without this
        // check, a caller could remove a membership row in ANOTHER tenant's group
        // just by knowing its groupId/userId, since GetMemberAsync alone performs
        // no tenant filtering. Mirrors the group lookup AddGroupMemberHandler
        // already does first.
        var group = await _groupRepository.GetByIdAsync(command.GroupId, cancellationToken);
        if (group is null)
        {
            return RemoveGroupMemberResult.NotFound();
        }

        var member = await _groupRepository.GetMemberAsync(command.GroupId, command.UserId, cancellationToken);
        if (member is null)
        {
            return RemoveGroupMemberResult.NotFound();
        }

        await _groupRepository.RemoveMemberAsync(member, cancellationToken);
        await _groupRepository.SaveChangesAsync(cancellationToken);

        return RemoveGroupMemberResult.Ok();
    }
}
