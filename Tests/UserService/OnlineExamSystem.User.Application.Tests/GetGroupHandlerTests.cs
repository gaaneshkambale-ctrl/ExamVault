using OnlineExamSystem.User.Application.Groups.GetById;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class GetGroupHandlerTests
{
    [Fact]
    public async Task Existing_group_returns_detail_with_members()
    {
        var repository = new FakeGroupRepository();
        var group = new Group { Name = "Batch 2026" };
        var memberId = Guid.NewGuid();
        await repository.AddAsync(group);
        await repository.AddMemberAsync(new GroupMember { GroupId = group.Id, UserId = memberId });
        var handler = new GetGroupHandler(repository);

        var result = await handler.HandleAsync(new GetGroupQuery(group.Id));

        Assert.NotNull(result);
        Assert.Equal("Batch 2026", result!.Group.Name);
        Assert.Single(result.MemberUserIds);
        Assert.Equal(memberId, result.MemberUserIds[0]);
    }

    [Fact]
    public async Task Unknown_group_returns_null()
    {
        var repository = new FakeGroupRepository();
        var handler = new GetGroupHandler(repository);

        var result = await handler.HandleAsync(new GetGroupQuery(Guid.NewGuid()));

        Assert.Null(result);
    }
}
