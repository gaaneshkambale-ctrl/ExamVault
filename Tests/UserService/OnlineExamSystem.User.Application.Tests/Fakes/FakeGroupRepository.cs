using OnlineExamSystem.User.Application.Groups;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakeGroupRepository : IGroupRepository
{
    private readonly List<Group> _groups = [];
    private readonly List<GroupMember> _members = [];

    public IReadOnlyList<Group> Groups => _groups;
    public IReadOnlyList<GroupMember> Members => _members;

    public Task<Group?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(_groups.FirstOrDefault(g => g.Id == id));

    public Task<Group?> GetByNameAsync(string name, Guid tenantId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_groups.FirstOrDefault(g => g.Name == name && g.TenantId == tenantId));

    public Task<IReadOnlyList<GroupWithMemberCount>> GetAllWithMemberCountsAsync(
        CancellationToken cancellationToken = default)
    {
        var result = _groups
            .OrderByDescending(g => g.CreatedAtUtc)
            .Select(g => new GroupWithMemberCount(g, _members.Count(m => m.GroupId == g.Id)))
            .ToList();
        return Task.FromResult<IReadOnlyList<GroupWithMemberCount>>(result);
    }

    public Task AddAsync(Group group, CancellationToken cancellationToken = default)
    {
        _groups.Add(group);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(Group group, CancellationToken cancellationToken = default)
    {
        _groups.RemoveAll(g => g.Id == group.Id);
        _members.RemoveAll(m => m.GroupId == group.Id);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Guid>> GetMemberUserIdsAsync(
        Guid groupId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Guid>>(_members.Where(m => m.GroupId == groupId).Select(m => m.UserId).ToList());

    public Task<GroupMember?> GetMemberAsync(
        Guid groupId,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_members.FirstOrDefault(m => m.GroupId == groupId && m.UserId == userId));

    public Task AddMemberAsync(GroupMember member, CancellationToken cancellationToken = default)
    {
        _members.Add(member);
        return Task.CompletedTask;
    }

    public Task RemoveMemberAsync(GroupMember member, CancellationToken cancellationToken = default)
    {
        _members.Remove(member);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
