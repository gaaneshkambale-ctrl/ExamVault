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
}
