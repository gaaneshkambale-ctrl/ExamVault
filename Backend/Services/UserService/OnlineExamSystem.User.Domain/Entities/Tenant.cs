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

    // Which Super Admin provisioned this organization - real accountability
    // for a platform-wide provisioning action, not previously tracked.
    // Nullable only because pre-existing seeded tenants (Default/Platform)
    // predate this field.
    public Guid? CreatedByUserId { get; set; }

    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }

    // Nullable = unlimited. These are the tenant's own EFFECTIVE limits -
    // seeded from the assigned Plan's own Max* fields (the entitlement
    // source) at tenant creation (CreateTenantHandler) and re-seeded on
    // every real plan change (AssignPlanToTenantHandler), but individually
    // overridable per org thereafter, same as before. MaxUsers is a flat
    // safety-net check across every role (CreateUserHandler); MaxStudents/
    // MaxAdmins/MaxInstructors are real per-role checks (also
    // CreateUserHandler); MaxExams is enforced by ExamService's
    // CreateExamHandler via a cross-service call. A plan downgrade never
    // deletes or deactivates existing users/exams that are now over the
    // new limit - it only blocks creating new ones past that point.
    public int? MaxUsers { get; set; }
    public int? MaxExams { get; set; }
    public int? MaxStudents { get; set; }
    public int? MaxAdmins { get; set; }
    public int? MaxInstructors { get; set; }

    // Bumped by RolePermissionRepository.ReplaceForRoleAsync every time ANY
    // role's permissions change for this tenant. Embedded in every access
    // token as the "permission_version" claim so downstream services can
    // detect a stale token (one issued before the bump) within one cache
    // cycle instead of waiting for its natural ~15-minute expiry.
    public int PermissionVersion { get; set; }

    // Organization Settings (tenant self-service profile, distinct from the
    // SuperAdmin-only provisioning fields above) - identity/contact/branding
    // used on the tenant's own PDF report letterhead and portal.
    public string? ShortName { get; set; }
    public int? EstablishedYear { get; set; }
    public string? Website { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? AlternatePhone { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? TaxIdentificationNumber { get; set; }
    public string? TimeZone { get; set; }

    public byte[]? LogoData { get; set; }
    public string? LogoContentType { get; set; }
    public byte[]? FaviconData { get; set; }
    public string? FaviconContentType { get; set; }

    public string? PrimaryColor { get; set; }
    public string? SecondaryColor { get; set; }
    public string? AccentColor { get; set; }
    public string? TextColor { get; set; }

    // Rendered on PDF reports as the signing authority - see
    // Authorized Signatory card on the Organization Settings page.
    public string? SignatoryName { get; set; }
    public string? SignatoryDesignation { get; set; }
    public byte[]? SignatureImageData { get; set; }
    public string? SignatureImageContentType { get; set; }

    public bool ShowLogoOnPdfReports { get; set; } = true;
    public bool IncludeAddressInPdfFooter { get; set; } = true;
    public bool ShowMottoTagline { get; set; } = true;
    public bool EnableMultiCampus { get; set; } = false;

    // PDF & Report Settings tab - options specific to the generated report
    // document itself, distinct from the organization-identity toggles above.
    public bool ShowQrCodeForVerification { get; set; } = true;
    public bool ShowContactDetails { get; set; } = true;
    public bool ShowPageNumbers { get; set; } = true;
    public bool UseBrandColorsInReportHeader { get; set; } = true;
    public bool EnableWatermark { get; set; } = false;
    public string? MottoTagline { get; set; }
    public string? DefaultAcademicYear { get; set; }
    public string? DefaultLanguage { get; set; }
    public string? DateFormat { get; set; }
}
