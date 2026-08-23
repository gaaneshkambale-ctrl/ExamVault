namespace OnlineExamSystem.User.Application.Users.Create;

public record CreateUserCommand(
    Guid TenantId,
    string FullName,
    string Email,
    string Role,
    bool IsActive = true,
    string? PhoneNumber = null,
    string? RollNumber = null);
