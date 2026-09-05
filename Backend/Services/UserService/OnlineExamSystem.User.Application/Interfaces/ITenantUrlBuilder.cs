namespace OnlineExamSystem.User.Application.Interfaces;

public interface ITenantUrlBuilder
{
    /// <summary>Builds the login URL to send in an invite/reset email. Pass
    /// <paramref name="isActive"/> = false for a tenant that hasn't been
    /// activated yet (its own subdomain 404s at the Gateway until then) -
    /// this returns the apex login URL instead, exactly like the
    /// Default/Platform reserved-slug case.</summary>
    string GetLoginUrl(string? tenantSlug, bool isActive = true);
}
