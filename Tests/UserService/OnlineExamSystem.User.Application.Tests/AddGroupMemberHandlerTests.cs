using OnlineExamSystem.User.Application.Groups.AddMember;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class AddGroupMemberHandlerTests
{
    [Fact]
    public async Task Valid_request_adds_student_to_group()
    {
        var groupRepository = new FakeGroupRepository();
        var userRepository = new FakeUserRepository();
        var group = new Group { Name = "Batch 2026" };
        var student = new AppUser { FullName = "Alice", Email = "alice@test.local", Role = UserRole.Student };
        await groupRepository.AddAsync(group);
        await userRepository.AddAsync(student);
        var handler = new AddGroupMemberHandler(groupRepository, userRepository);

        var result = await handler.HandleAsync(new AddGroupMemberCommand(group.Id, student.Id));

        Assert.True(result.Success);
        Assert.Single(groupRepository.Members);
    }

    [Fact]
    public async Task Unknown_group_returns_not_found()
    {
        var groupRepository = new FakeGroupRepository();
        var userRepository = new FakeUserRepository();
        var student = new AppUser { FullName = "Alice", Email = "alice@test.local", Role = UserRole.Student };
        await userRepository.AddAsync(student);
        var handler = new AddGroupMemberHandler(groupRepository, userRepository);

        var result = await handler.HandleAsync(new AddGroupMemberCommand(Guid.NewGuid(), student.Id));

        Assert.False(result.Success);
        Assert.True(result.IsGroupNotFound);
    }

    [Fact]
    public async Task Unknown_user_returns_not_found()
    {
        var groupRepository = new FakeGroupRepository();
        var userRepository = new FakeUserRepository();
        var group = new Group { Name = "Batch 2026" };
        await groupRepository.AddAsync(group);
        var handler = new AddGroupMemberHandler(groupRepository, userRepository);

        var result = await handler.HandleAsync(new AddGroupMemberCommand(group.Id, Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.IsUserNotFound);
    }

    [Fact]
    public async Task Non_student_user_is_rejected()
    {
        var groupRepository = new FakeGroupRepository();
        var userRepository = new FakeUserRepository();
        var group = new Group { Name = "Batch 2026" };
        var admin = new AppUser { FullName = "Bob Admin", Email = "bob@test.local", Role = UserRole.Admin };
        await groupRepository.AddAsync(group);
        await userRepository.AddAsync(admin);
        var handler = new AddGroupMemberHandler(groupRepository, userRepository);

        var result = await handler.HandleAsync(new AddGroupMemberCommand(group.Id, admin.Id));

        Assert.False(result.Success);
        Assert.True(result.IsNotStudent);
        Assert.Empty(groupRepository.Members);
    }

    [Fact]
    public async Task Already_a_member_is_rejected()
    {
        var groupRepository = new FakeGroupRepository();
        var userRepository = new FakeUserRepository();
        var group = new Group { Name = "Batch 2026" };
        var student = new AppUser { FullName = "Alice", Email = "alice@test.local", Role = UserRole.Student };
        await groupRepository.AddAsync(group);
        await userRepository.AddAsync(student);
        await groupRepository.AddMemberAsync(new GroupMember { GroupId = group.Id, UserId = student.Id });
        var handler = new AddGroupMemberHandler(groupRepository, userRepository);

        var result = await handler.HandleAsync(new AddGroupMemberCommand(group.Id, student.Id));

        Assert.False(result.Success);
        Assert.True(result.IsAlreadyMember);
        Assert.Single(groupRepository.Members);
    }
}
