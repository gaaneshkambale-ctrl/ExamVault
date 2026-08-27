namespace OnlineExamSystem.User.Application.Interfaces;

public interface ITenantUrlBuilder
{
    string GetLoginUrl(string? tenantSlug);
}
