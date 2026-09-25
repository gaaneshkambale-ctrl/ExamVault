namespace OnlineExamSystem.User.Application.Interfaces;

public interface ITenantUrlBuilder
{
    /// <summary>Builds the login URL to send in an invite/reset email. Pass
    /// <paramref name="isActive"/> = false for a tenant that hasn't been
    /// activated yet (its own subdomain 404s at the Gateway until then) -
    /// this returns the apex login URL instead, exactly like the
    /// Default/Platform reserved-slug case.</summary>
    string GetLoginUrl(string? tenantSlug, bool isActive = true);

    /// <summary>Builds the reset-password link to send in a forgot-password email -
    /// same tenant-subdomain-vs-apex logic as <see cref="GetLoginUrl"/>, with the raw
    /// (unhashed) token appended as a query parameter.</summary>
    string GetResetPasswordUrl(string? tenantSlug, bool isActive, string token);

    /// <summary>Builds the confirm-email link sent after self-registration - same
    /// tenant-subdomain-vs-apex logic as <see cref="GetLoginUrl"/>. Self-registered
    /// users always land in the Default tenant (no subdomain yet, see
    /// RegisterUserHandler), so in practice this always resolves to the apex URL,
    /// same as GetResetPasswordUrl's Default-tenant case.</summary>
    string GetConfirmEmailUrl(string? tenantSlug, bool isActive, string token);
}
