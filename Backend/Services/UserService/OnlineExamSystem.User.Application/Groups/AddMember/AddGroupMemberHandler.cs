using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Groups.AddMember;

public class AddGroupMemberHandler
{
    private readonly IGroupRepository _groupRepository;
    private readonly IUserRepository _userRepository;

    public AddGroupMemberHandler(IGroupRepository groupRepository, IUserRepository userRepository)
    {
        _groupRepository = groupRepository;
        _userRepository = userRepository;
    }

    public async Task<AddGroupMemberResult> HandleAsync(
        AddGroupMemberCommand command,
        CancellationToken cancellationToken = default)
    {
        var group = await _groupRepository.GetByIdAsync(command.GroupId, cancellationToken);
        if (group is null)
        {
            return AddGroupMemberResult.GroupNotFound();
        }

        // Tenant-scoped: the group lookup above is (query filter), but AppUser
        // isn't filtered - the unscoped lookup let an Admin add another
        // tenant's student by id and then see them in the member list.
        var user = await _userRepository.GetByIdForTenantAsync(command.UserId, cancellationToken);
        if (user is null)
        {
            return AddGroupMemberResult.UserNotFound();
        }

        if (user.Role != UserRole.Student)
        {
            return AddGroupMemberResult.NotStudent();
        }

        var existingMember = await _groupRepository.GetMemberAsync(command.GroupId, command.UserId, cancellationToken);
        if (existingMember is not null)
        {
            return AddGroupMemberResult.AlreadyMember();
        }

        var member = new GroupMember { GroupId = command.GroupId, UserId = command.UserId };
        await _groupRepository.AddMemberAsync(member, cancellationToken);
        await _groupRepository.SaveChangesAsync(cancellationToken);

        return AddGroupMemberResult.Ok(member);
    }
}
