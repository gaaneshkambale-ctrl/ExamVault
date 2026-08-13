using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Groups.AddMember;

public class AddGroupMemberResult
{
    public bool Success { get; init; }
    public bool IsGroupNotFound { get; init; }
    public bool IsUserNotFound { get; init; }
    public bool IsNotStudent { get; init; }
    public bool IsAlreadyMember { get; init; }
    public GroupMember? Member { get; init; }

    public static AddGroupMemberResult Ok(GroupMember member) => new() { Success = true, Member = member };

    public static AddGroupMemberResult GroupNotFound() => new() { IsGroupNotFound = true };

    public static AddGroupMemberResult UserNotFound() => new() { IsUserNotFound = true };

    public static AddGroupMemberResult NotStudent() => new() { IsNotStudent = true };

    public static AddGroupMemberResult AlreadyMember() => new() { IsAlreadyMember = true };
}
