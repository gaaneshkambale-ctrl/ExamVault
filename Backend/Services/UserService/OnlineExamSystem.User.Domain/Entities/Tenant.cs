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

    // Manual, Super Admin controlled - not derived from CreatedAtUtc or
    // any fixed platform-wide duration. TrialEndsAtUtc is only meaningful
    // while IsTrial is true; ending a trial always clears it.
    public bool IsTrial { get; set; } = false;
    public DateTime? TrialEndsAtUtc { get; set; }

    // Free-text organization identifiers - OrganizationType is dropdown-
    // driven on the frontend but stored as plain text here, same precedent
    // as ExamPaper.Category (classification, not a hardcoded backend enum).
    public string? OrganizationCode { get; set; }
    public string? OrganizationType { get; set; }

    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }

    // Bumped by RolePermissionRepository.ReplaceForRoleAsync every time ANY
    // role's permissions change for this tenant. Embedded in every access
    // token as the "permission_version" claim so downstream services can
    // detect a stale token (one issued before the bump) within one cache
    // cycle instead of waiting for its natural ~15-minute expiry.
    public int PermissionVersion { get; set; }
}
