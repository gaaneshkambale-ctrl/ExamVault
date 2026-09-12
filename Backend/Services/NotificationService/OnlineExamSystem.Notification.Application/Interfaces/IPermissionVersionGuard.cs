using System.Security.Claims;

namespace OnlineExamSystem.Notification.Application.Interfaces;

// Detects whether the caller's access token was issued before the tenant's
// permissions last changed, within one short cache cycle instead of only at
// the token's natural ~15-minute expiry. Used inside every Permission:*
// authorization policy alongside the existing role/claim check.
public interface IPermissionVersionGuard
{
    Task<bool> IsFreshAsync(ClaimsPrincipal user, CancellationToken cancellationToken = default);
}
