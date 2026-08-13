using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.User.Application.Groups;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Persistence;

namespace OnlineExamSystem.User.Infrastructure.Repositories;

public class GroupRepository : IGroupRepository
{
    private readonly UserDbContext _dbContext;

    public GroupRepository(UserDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<Group?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Groups.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);

    public Task<Group?> GetByNameAsync(string name, CancellationToken cancellationToken = default) =>
        _dbContext.Groups.FirstOrDefaultAsync(g => g.Name == name, cancellationToken);

    public async Task<IReadOnlyList<GroupWithMemberCount>> GetAllWithMemberCountsAsync(
        CancellationToken cancellationToken = default)
    {
        var groups = await _dbContext.Groups.OrderByDescending(g => g.CreatedAtUtc).ToListAsync(cancellationToken);
        var counts = await _dbContext.GroupMembers
            .GroupBy(m => m.GroupId)
            .Select(g => new { GroupId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.GroupId, g => g.Count, cancellationToken);

        return groups.Select(g => new GroupWithMemberCount(g, counts.GetValueOrDefault(g.Id))).ToList();
    }

    public async Task AddAsync(Group group, CancellationToken cancellationToken = default) =>
        await _dbContext.Groups.AddAsync(group, cancellationToken);

    public Task RemoveAsync(Group group, CancellationToken cancellationToken = default)
    {
        _dbContext.Groups.Remove(group);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<Guid>> GetMemberUserIdsAsync(
        Guid groupId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.GroupMembers
            .Where(m => m.GroupId == groupId)
            .Select(m => m.UserId)
            .ToListAsync(cancellationToken);

    public Task<GroupMember?> GetMemberAsync(
        Guid groupId,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        _dbContext.GroupMembers.FirstOrDefaultAsync(
            m => m.GroupId == groupId && m.UserId == userId,
            cancellationToken);

    public async Task AddMemberAsync(GroupMember member, CancellationToken cancellationToken = default) =>
        await _dbContext.GroupMembers.AddAsync(member, cancellationToken);

    public Task RemoveMemberAsync(GroupMember member, CancellationToken cancellationToken = default)
    {
        _dbContext.GroupMembers.Remove(member);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
