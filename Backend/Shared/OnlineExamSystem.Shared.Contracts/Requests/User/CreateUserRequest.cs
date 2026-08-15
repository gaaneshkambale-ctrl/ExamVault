namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record CreateUserRequest(
    string FullName,
    string Email,
    string Role,
    bool IsActive = true,
    string? PhoneNumber = null);
