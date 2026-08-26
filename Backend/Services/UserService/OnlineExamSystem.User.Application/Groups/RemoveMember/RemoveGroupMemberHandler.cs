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
