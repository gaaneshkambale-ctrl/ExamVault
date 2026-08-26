namespace OnlineExamSystem.User.Application.Users.Update;

public record UpdateUserCommand(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    string? PhoneNumber = null,
    string? RollNumber = null);
