namespace OnlineExamSystem.User.Application.Groups.AddMember;

public record AddGroupMemberCommand(Guid GroupId, Guid UserId);
