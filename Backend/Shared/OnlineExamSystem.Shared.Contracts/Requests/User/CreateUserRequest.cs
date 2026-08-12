namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record CreateUserRequest(string FullName, string Email, string Password, string Role);
