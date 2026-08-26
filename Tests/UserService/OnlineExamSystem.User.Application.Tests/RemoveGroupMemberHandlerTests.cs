using OnlineExamSystem.User.Application.Groups.RemoveMember;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class RemoveGroupMemberHandlerTests
{
    [Fact]
    public async Task Valid_request_removes_member()
    {
        var repository = new FakeGroupRepository();
        var groupId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        await repository.AddMemberAsync(new GroupMember { GroupId = groupId, UserId = userId });
        var handler = new RemoveGroupMemberHandler(repository);

        var result = await handler.HandleAsync(new RemoveGroupMemberCommand(groupId, userId));

        Assert.True(result.Success);
        Assert.Empty(repository.Members);
    }

    [Fact]
    public async Task Non_member_returns_not_found()
    {
        var repository = new FakeGroupRepository();
        var handler = new RemoveGroupMemberHandler(repository);

        var result = await handler.HandleAsync(new RemoveGroupMemberCommand(Guid.NewGuid(), Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }
}
