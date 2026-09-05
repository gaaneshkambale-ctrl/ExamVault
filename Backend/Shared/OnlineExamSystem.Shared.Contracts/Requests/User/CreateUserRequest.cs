namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record CreateUserRequest(
    string FullName,
    string Email,
    string Role,
    string? PhoneNumber = null,
    string? RollNumber = null);
