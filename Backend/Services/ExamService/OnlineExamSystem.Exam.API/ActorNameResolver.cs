using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.API;

// Resolves CreatedBy actor Guids into display names for Super Admin-facing
// responses - a cross-service batch lookup against User Service's internal
// endpoint, since Exam Service has no local copy of user data. Mirrors User
// Service's own same-database ActorNameResolver, just backed by
// IInternalUserLookupClient instead of a direct repository call.
internal static class ActorNameResolver
{
    public static async Task<Dictionary<Guid, string>> ResolveAsync(
        IInternalUserLookupClient userLookupClient,
        IEnumerable<Guid?> actorIds,
        CancellationToken cancellationToken)
    {
        var ids = actorIds.Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<Guid, string>();
        }

        var users = await userLookupClient.GetUsersByIdsAsync(ids, cancellationToken);
        return users.ToDictionary(u => u.Id, u => u.FullName);
    }

    public static async Task<string?> ResolveOneAsync(
        IInternalUserLookupClient userLookupClient,
        Guid? actorId,
        CancellationToken cancellationToken)
    {
        if (actorId is null)
        {
            return null;
        }

        var users = await userLookupClient.GetUsersByIdsAsync([actorId.Value], cancellationToken);
        return users.FirstOrDefault()?.FullName;
    }
}
