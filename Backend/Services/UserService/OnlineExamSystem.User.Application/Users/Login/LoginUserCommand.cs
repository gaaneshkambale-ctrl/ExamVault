namespace OnlineExamSystem.User.Application.Users.Login;

public record LoginUserCommand(string Email, string Password, string? UserAgent = null, string? IpAddress = null);
