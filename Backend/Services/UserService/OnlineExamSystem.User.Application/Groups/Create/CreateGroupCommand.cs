namespace OnlineExamSystem.User.Application.Groups.Create;

public record CreateGroupCommand(Guid TenantId, string Name);
