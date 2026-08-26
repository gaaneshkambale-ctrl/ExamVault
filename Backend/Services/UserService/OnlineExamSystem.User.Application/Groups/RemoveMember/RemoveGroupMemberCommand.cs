namespace OnlineExamSystem.User.Application.Groups.RemoveMember;

public record RemoveGroupMemberCommand(Guid GroupId, Guid UserId);
