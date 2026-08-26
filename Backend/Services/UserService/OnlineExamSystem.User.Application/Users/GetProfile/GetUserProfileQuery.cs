namespace OnlineExamSystem.User.Application.Users.GetProfile;

// TenantScoped=false (default) is for the self-service "me" lookup - the
// id always comes from the caller's own JWT, never attacker-suppliable.
// Admin-facing lookups by a route-parameter id (GetById/GetPhoto) must
// pass true, or they'd let an Admin view another tenant's user.
public record GetUserProfileQuery(Guid UserId, bool TenantScoped = false);
