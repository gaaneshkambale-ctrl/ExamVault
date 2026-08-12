namespace OnlineExamSystem.User.Application.Users.Delete;

public class DeleteUserResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }

    public static DeleteUserResult Ok() => new() { Success = true };

    public static DeleteUserResult NotFound() => new() { Success = false, IsNotFound = true };
}
