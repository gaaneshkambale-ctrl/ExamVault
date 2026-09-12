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
        var group = new Group { Name = "Batch 2026" };
        var userId = Guid.NewGuid();
        await repository.AddAsync(group);
        await repository.AddMemberAsync(new GroupMember { GroupId = group.Id, UserId = userId });
        var handler = new RemoveGroupMemberHandler(repository);

        var result = await handler.HandleAsync(new RemoveGroupMemberCommand(group.Id, userId));

        Assert.True(result.Success);
        Assert.Empty(repository.Members);
    }

    [Fact]
    public async Task Non_member_returns_not_found()
    {
        var repository = new FakeGroupRepository();
        var group = new Group { Name = "Batch 2026" };
        await repository.AddAsync(group);
        var handler = new RemoveGroupMemberHandler(repository);

        var result = await handler.HandleAsync(new RemoveGroupMemberCommand(group.Id, Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }

    [Fact]
    public async Task Group_outside_the_callers_tenant_returns_not_found_even_with_a_real_member_row()
    {
        // FakeGroupRepository has no tenant filter of its own (unlike the real
        // EF-backed repository's query filter) - this simulates a cross-tenant
        // groupId by simply never seeding the Group itself, matching what the
        // real tenant-scoped GetByIdAsync would return for a group belonging
        // to a different tenant: null. Guards against the IDOR this fix closes -
        // removing a member row via groupId+userId alone, without confirming
        // the group itself resolves under the caller's own tenant first.
        var repository = new FakeGroupRepository();
        var otherTenantGroupId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        await repository.AddMemberAsync(new GroupMember { GroupId = otherTenantGroupId, UserId = userId });
        var handler = new RemoveGroupMemberHandler(repository);

        var result = await handler.HandleAsync(new RemoveGroupMemberCommand(otherTenantGroupId, userId));

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
        Assert.NotEmpty(repository.Members);
    }
}
