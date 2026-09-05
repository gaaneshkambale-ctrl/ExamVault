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

    // Stored + displayed reference values only - no billing/payment system
    // exists anywhere in this codebase, and this deliberately doesn't add
    // one. Never used in any calculation.
    public decimal? MonthlyPrice { get; set; }
    public decimal? AnnualPrice { get; set; }

    // The entitlement source for Tenant's own MaxUsers/MaxAdmins/
    // MaxInstructors/MaxStudents/MaxExams ("effective limits" - seeded from
    // here at tenant creation and on every real plan change, see
    // CreateTenantHandler/AssignPlanToTenantHandler). Nullable = unlimited,
    // same convention Tenant already used before this existed.
    public int? MaxStudents { get; set; }
    public int? MaxAdmins { get; set; }
    public int? MaxInstructors { get; set; }
    public int? MaxExams { get; set; }

    // Persisted + displayed only - deliberately NOT enforced anywhere.
    // No question-count check, no monthly AI-generation usage counter, and
    // no storage-accounting system exist anywhere in this codebase; adding
    // real enforcement for these would mean building that metering
    // infrastructure from scratch, which is explicitly out of scope here.
    public int? MaxQuestions { get; set; }
    public int? MaxAiQuestionsPerMonth { get; set; }
    public int? StorageGb { get; set; }

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    // Which Super Admin created/last edited this pricing plan - real
    // accountability for a platform-wide entitlement template, not
    // previously tracked. Nullable only because pre-existing seeded plans
    // predate this field.
    public Guid? CreatedByUserId { get; set; }
    public Guid? UpdatedByUserId { get; set; }
}
