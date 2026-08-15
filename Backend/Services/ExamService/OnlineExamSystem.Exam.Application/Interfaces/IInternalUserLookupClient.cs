namespace OnlineExamSystem.Exam.Application.Interfaces;

/// <summary>Resolves Email/FullName for a set of user ids with no bearer token, for callers that
/// have no user request context to forward a JWT from - the reminder check background job, which
/// has no HTTP caller at all. Hits User Service's anonymous internal-only endpoint rather than the
/// [Authorize(Roles="Admin")] GET /api/users that IUserLookupClient uses.</summary>
public interface IInternalUserLookupClient
{
    Task<IReadOnlyList<UserLookupInfo>> GetUsersByIdsAsync(
        IReadOnlyList<Guid> userIds,
        CancellationToken cancellationToken = default);
}
