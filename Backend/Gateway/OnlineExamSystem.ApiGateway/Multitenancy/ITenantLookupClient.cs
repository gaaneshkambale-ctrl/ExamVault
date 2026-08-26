namespace OnlineExamSystem.ApiGateway.Multitenancy;

public record TenantLookupResult(Guid Id, string Name, string Slug, bool IsActive);

// Calls User Service's internal (non-Gateway-routed) tenant-by-slug lookup
// directly - the Gateway's first-ever service-to-service call, matching the
// "not exposed via any Gateway route" pattern already used for Question
// Service's answer-key endpoint.
public interface ITenantLookupClient
{
    Task<TenantLookupResult?> GetBySlugAsync(string slug, CancellationToken cancellationToken);
}
