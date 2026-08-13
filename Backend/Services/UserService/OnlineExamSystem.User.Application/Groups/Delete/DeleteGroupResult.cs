namespace OnlineExamSystem.User.Application.Groups.Delete;

public class DeleteGroupResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }

    public static DeleteGroupResult Ok() => new() { Success = true };

    public static DeleteGroupResult NotFound() => new() { IsNotFound = true };
}
