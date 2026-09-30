namespace OnlineExamSystem.User.Application.AcademicLists.Create;

public record CreateAcademicListItemCommand(Guid TenantId, string ListType, string Value, Guid? ParentId);
