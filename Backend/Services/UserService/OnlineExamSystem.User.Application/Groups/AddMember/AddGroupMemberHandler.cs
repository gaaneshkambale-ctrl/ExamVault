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

        var user = await _userRepository.GetByIdAsync(command.UserId, cancellationToken);
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
