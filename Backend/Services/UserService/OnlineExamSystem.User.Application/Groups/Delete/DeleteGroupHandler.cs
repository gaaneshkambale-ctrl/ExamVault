using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Groups.Delete;

public class DeleteGroupHandler
{
    private readonly IGroupRepository _groupRepository;

    public DeleteGroupHandler(IGroupRepository groupRepository)
    {
        _groupRepository = groupRepository;
    }

    public async Task<DeleteGroupResult> HandleAsync(
        DeleteGroupCommand command,
        CancellationToken cancellationToken = default)
    {
        var group = await _groupRepository.GetByIdAsync(command.GroupId, cancellationToken);
        if (group is null)
        {
            return DeleteGroupResult.NotFound();
        }

        await _groupRepository.RemoveAsync(group, cancellationToken);
        await _groupRepository.SaveChangesAsync(cancellationToken);

        return DeleteGroupResult.Ok();
    }
}
