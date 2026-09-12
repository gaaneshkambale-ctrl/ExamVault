namespace OnlineExamSystem.Submission.Application.Interfaces;

public record UserLookupInfo(Guid Id, string Email, string FullName);

/// <summary>Resolves Email/FullName for a set of user ids - Submission Service has no
/// local copy of user data, so this hits User Service's anonymous internal-only endpoint
/// (never routed through the Gateway). Mirrors Exam/Question Service's own
/// IInternalUserLookupClient.</summary>
public interface IInternalUserLookupClient
{
    Task<IReadOnlyList<UserLookupInfo>> GetUsersByIdsAsync(
        IReadOnlyList<Guid> userIds,
        CancellationToken cancellationToken = default);
}
