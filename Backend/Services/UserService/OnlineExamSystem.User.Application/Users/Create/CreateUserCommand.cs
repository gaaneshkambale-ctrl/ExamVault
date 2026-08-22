namespace OnlineExamSystem.User.Application.Users.Create;

public record CreateUserCommand(
    string FullName,
    string Email,
    string Role,
    bool IsActive = true,
    string? PhoneNumber = null,
    string? RollNumber = null);
