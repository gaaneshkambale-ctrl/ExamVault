namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record UpdateUserRequest(string FullName, string Email, string Role, string? PhoneNumber = null);
