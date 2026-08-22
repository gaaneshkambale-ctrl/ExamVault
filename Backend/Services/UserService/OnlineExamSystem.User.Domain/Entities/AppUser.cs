using OnlineExamSystem.Shared.Common.Entities;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Domain.Entities;

public class AppUser : BaseEntity
{
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
    public DateTime? LastLoginAtUtc { get; set; }

    // Real auto-increment counter (same UseIdentityColumn() pattern as
    // ExamAssignment.AssignmentNumber) powering the "EV-ADM-0001"-style
    // formatted user id shown on the profile page - not stored as a string.
    public int UserNumber { get; set; }
}
