using OnlineExamSystem.User.Application.Groups.Create;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class CreateGroupHandlerTests
{
    private static readonly Guid TenantId = Guid.NewGuid();

    private static CreateGroupHandler CreateHandler(FakeGroupRepository repository) =>
        new(repository, new CreateGroupValidator());

    [Fact]
    public async Task Valid_request_creates_group()
    {
        var repository = new FakeGroupRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new CreateGroupCommand(TenantId, "Batch 2026"));

        Assert.True(result.Success);
        Assert.Equal("Batch 2026", result.Group!.Name);
        Assert.Single(repository.Groups);
    }

    [Fact]
    public async Task Duplicate_name_is_rejected()
    {
        var repository = new FakeGroupRepository();
        await repository.AddAsync(new Group { TenantId = TenantId, Name = "Batch 2026" });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new CreateGroupCommand(TenantId, "Batch 2026"));

        Assert.False(result.Success);
        Assert.True(result.NameAlreadyExists);
        Assert.Single(repository.Groups);
    }

    [Fact]
    public async Task Same_name_in_a_different_tenant_is_allowed()
    {
        var repository = new FakeGroupRepository();
        await repository.AddAsync(new Group { TenantId = Guid.NewGuid(), Name = "Batch 2026" });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new CreateGroupCommand(TenantId, "Batch 2026"));

        Assert.True(result.Success);
        Assert.Equal(2, repository.Groups.Count);
    }

    [Fact]
    public async Task Empty_name_fails_validation()
    {
        var repository = new FakeGroupRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new CreateGroupCommand(TenantId, ""));

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
        Assert.Empty(repository.Groups);
    }
}
