namespace OnlineExamSystem.User.Application.Groups.RemoveMember;

public class RemoveGroupMemberResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }

    public static RemoveGroupMemberResult Ok() => new() { Success = true };

    public static RemoveGroupMemberResult NotFound() => new() { IsNotFound = true };
}
