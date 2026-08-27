using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.User.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    // The subdomain this tenant is reached at, e.g. "stanford" for
    // stanford.examvaults.in. Resolved from the request Host header once
    // Gateway subdomain routing ships - not enforced yet.
    public string Slug { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    // Which Admin-console modules this org has access to. Always set -
    // every Tenant seeded/created before subscription plans shipped got
    // backfilled to the "Full Access" plan, and Create Organization
    // defaults to it too.
    public Guid PlanId { get; set; }
}
