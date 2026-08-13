using OnlineExamSystem.User.Application.Groups;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface IGroupRepository
{
    Task<Group?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Group?> GetByNameAsync(string name, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GroupWithMemberCount>> GetAllWithMemberCountsAsync(CancellationToken cancellationToken = default);
    Task AddAsync(Group group, CancellationToken cancellationToken = default);
    Task RemoveAsync(Group group, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Guid>> GetMemberUserIdsAsync(Guid groupId, CancellationToken cancellationToken = default);
    Task<GroupMember?> GetMemberAsync(Guid groupId, Guid userId, CancellationToken cancellationToken = default);
    Task AddMemberAsync(GroupMember member, CancellationToken cancellationToken = default);
    Task RemoveMemberAsync(GroupMember member, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
