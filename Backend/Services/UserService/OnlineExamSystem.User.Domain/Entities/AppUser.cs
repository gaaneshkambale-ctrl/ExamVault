using OnlineExamSystem.Shared.Common.Entities;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Domain.Entities;

// Deliberately BaseEntity, not TenantScopedEntity: Login and Register run
// before any tenant context exists (no JWT yet), so this table cannot carry
// a global tenant query filter the way Group does - see UserDbContext's own
// comment. TenantId is still a real, indexed column (Phase 1); every
// handler that touches it passes tenantId explicitly instead of relying on
// ambient context.
public class AppUser : BaseEntity
{
    public Guid TenantId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? RollNumber { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Student;
    public bool IsActive { get; set; } = true;
    public string? PhoneNumber { get; set; }
    public bool MustChangePassword { get; set; }
    public byte[]? PhotoData { get; set; }
    public string? PhotoContentType { get; set; }

    // Profile redesign fields - all optional, self-editable via the
    // Personal Information form (Department included, even though the
    // mockup shows it in a read-only summary card - without an edit path
    // it would be an unsettable, effectively fake field).
    public string? Username { get; set; }
    public string? AlternateEmail { get; set; }
    public Gender? Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Location { get; set; }
    public string? Department { get; set; }
    public string? Designation { get; set; }
    public DateTime? LastLoginAtUtc { get; set; }

    // Account lockout (Security Settings > Password Policy's "Maximum Login
    // Attempts") - incremented on each wrong-password login by LoginUserHandler,
    // reset to 0 on a successful login. LockoutEndUtc is null while unlocked;
    // set to UtcNow + PlatformSettings.LockoutMinutes once the attempt count hits
    // PlatformSettings.MaxLoginAttempts, and checked (not just relied on the
    // counter) so the lockout actually expires on its own.
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockoutEndUtc { get; set; }

    // Real auto-increment counter (same UseIdentityColumn() pattern as
    // ExamAssignment.AssignmentNumber) powering the "EV-ADM-0001"-style
    // formatted user id shown on the profile page - not stored as a string.
    public int UserNumber { get; set; }

    // Which Admin/SuperAdmin created this account - real accountability for
    // who added a user to the system. Null for self-registered accounts
    // (RegisterUserHandler - there's no admin creator, the user created
    // themselves) and for pre-existing accounts that predate this field.
    public Guid? CreatedByUserId { get; set; }

    // Organization-type-specific fields captured at Add/Edit User time -
    // eg. a College student's Enrollment No./PRN/Semester, a Coaching
    // Institute student's Batch/Test Series. JSON-serialized
    // Dictionary<string,string>, same flexible-schema approach as
    // OrganizationAcademicConfig.AcademicFieldsJson and for the same
    // reason: which fields matter varies entirely by the tenant's
    // Organization Type, so this deliberately isn't a fixed set of new
    // columns. Null/empty for every user created before this existed, and
    // for non-Student roles where these fields aren't shown.
    public string? AcademicFieldsJson { get; set; }
}
