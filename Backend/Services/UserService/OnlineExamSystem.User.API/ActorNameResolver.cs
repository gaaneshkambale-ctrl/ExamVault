using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.API;

// Resolves CreatedBy/UpdatedBy actor Guids into display names for admin-
// facing responses - a read-time batch lookup (IUserRepository.GetByIdsAsync
// is already unscoped by tenant, needed since Super Admin's own views span
// tenants), not a stored/denormalized name, since these audit fields were
// only just added and existing rows have no captured name to fall back on.
internal static class ActorNameResolver
{
    public static async Task<Dictionary<Guid, string>> ResolveAsync(
        IUserRepository userRepository,
        IEnumerable<Guid?> actorIds,
        CancellationToken cancellationToken)
    {
        var ids = actorIds.Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<Guid, string>();
        }

        var users = await userRepository.GetByIdsAsync(ids, cancellationToken);
        return users.ToDictionary(u => u.Id, u => u.FullName);
    }

    public static async Task<string?> ResolveOneAsync(
        IUserRepository userRepository,
        Guid? actorId,
        CancellationToken cancellationToken)
    {
        if (actorId is null)
        {
            return null;
        }

        var user = await userRepository.GetByIdAsync(actorId.Value, cancellationToken);
        return user?.FullName;
    }
}
