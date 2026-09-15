namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record AcademicListItemResponse(Guid Id, string ListType, string Value, Guid? ParentId, DateTime CreatedAtUtc);
