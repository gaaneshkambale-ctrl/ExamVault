using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.API;

// Resolves user Guids into display names/emails for Super Admin-facing
// responses - a cross-service batch lookup against User Service's internal
// endpoint, since Submission Service has no local copy of user data.
// Mirrors Exam/Question Service's own ActorNameResolver.
internal static class ActorNameResolver
{
    public static async Task<Dictionary<Guid, UserLookupInfo>> ResolveAsync(
        IInternalUserLookupClient userLookupClient,
        IEnumerable<Guid> userIds,
        CancellationToken cancellationToken)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<Guid, UserLookupInfo>();
        }

        var users = await userLookupClient.GetUsersByIdsAsync(ids, cancellationToken);
        return users.ToDictionary(u => u.Id);
    }
}
