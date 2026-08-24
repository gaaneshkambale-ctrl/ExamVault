using OnlineExamSystem.Shared.Common.Entities;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.User.Domain.Entities;

// Not tenant-scoped itself - a Plan is a platform-wide template Super Admin
// defines once and assigns to any number of Tenants (Tenant.PlanId).
public class Plan : BaseEntity
{
    public required string Name { get; set; }
    public string? Description { get; set; }
    public List<PlanFeature> IncludedFeatures { get; set; } = [];
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
