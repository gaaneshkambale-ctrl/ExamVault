using OnlineExamSystem.Question.Application.Interfaces;

namespace OnlineExamSystem.Question.API;

// Resolves CreatedBy actor Guids into display names for Super Admin-facing
// responses - a cross-service batch lookup against User Service's internal
// endpoint, since Question Service has no local copy of user data. Mirrors
// Exam Service's own ActorNameResolver.
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
}
