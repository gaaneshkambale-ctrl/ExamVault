namespace OnlineExamSystem.User.Application.Users.Create;

public record CreateUserCommand(string FullName, string Email, string Password, string Role);
