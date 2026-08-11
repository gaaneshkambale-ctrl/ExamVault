namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record RegisterUserRequest(string FullName, string Email, string Password);
