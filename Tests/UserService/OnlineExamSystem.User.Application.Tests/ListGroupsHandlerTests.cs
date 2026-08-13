using OnlineExamSystem.User.Application.Groups.List;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class ListGroupsHandlerTests
{
    [Fact]
    public async Task Returns_groups_with_member_counts()
    {
        var repository = new FakeGroupRepository();
        var group = new Group { Name = "Batch 2026" };
        await repository.AddAsync(group);
        await repository.AddMemberAsync(new GroupMember { GroupId = group.Id, UserId = Guid.NewGuid() });
        await repository.AddMemberAsync(new GroupMember { GroupId = group.Id, UserId = Guid.NewGuid() });
        var handler = new ListGroupsHandler(repository);

        var result = await handler.HandleAsync(new ListGroupsQuery());

        Assert.Single(result);
        Assert.Equal(2, result[0].MemberCount);
    }
}
