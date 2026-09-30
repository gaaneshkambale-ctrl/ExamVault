using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.User.Domain.Entities;

// One row per Tenant (1:1), holding the organization-type-specific fields
// captured on the "Academic Configuration" tab of Organization Settings -
// eg. a College's University/Program/Semester, or a Coaching Institute's
// Batch/Test Series/Rank. Deliberately NOT modeled as separate
// CollegeConfig/CoachingConfig/... tables (would mean a new table + handler
// + migration for every future organization type) - instead a flexible
// key/value map, keyed by field names the frontend's per-type field catalog
// defines (see Frontend/.../constants/organizationTypeFieldCatalog.ts).
// Values are plain strings; the UI decides which keys are relevant for the
// tenant's current OrganizationType. Storage-only in this phase - not yet
// read by any PDF/report generator.
public class OrganizationAcademicConfig : BaseEntity
{
    public required Guid TenantId { get; set; }

    // JSON-serialized Dictionary<string,string> - eg. {"university":"Pune University","semester":"VI"}.
    public string AcademicFieldsJson { get; set; } = "{}";

    // JSON-serialized List<string> of selected result-field keys - eg. ["studentName","rank","percentile"].
    public string ResultFieldsJson { get; set; } = "[]";

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; set; }
}
