using OnlineExamSystem.User.Application.Groups.Delete;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class DeleteGroupHandlerTests
{
    [Fact]
    public async Task Valid_request_deletes_group_and_its_members()
    {
        var repository = new FakeGroupRepository();
        var group = new Group { Name = "Batch 2026" };
        await repository.AddAsync(group);
        await repository.AddMemberAsync(new GroupMember { GroupId = group.Id, UserId = Guid.NewGuid() });
        var handler = new DeleteGroupHandler(repository);

        var result = await handler.HandleAsync(new DeleteGroupCommand(group.Id));

        Assert.True(result.Success);
        Assert.Empty(repository.Groups);
        Assert.Empty(repository.Members);
    }

    [Fact]
    public async Task Unknown_group_returns_not_found()
    {
        var repository = new FakeGroupRepository();
        var handler = new DeleteGroupHandler(repository);

        var result = await handler.HandleAsync(new DeleteGroupCommand(Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }
}
