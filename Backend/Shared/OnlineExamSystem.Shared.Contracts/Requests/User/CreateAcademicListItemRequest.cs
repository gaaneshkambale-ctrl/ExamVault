namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record CreateAcademicListItemRequest(string ListType, string Value, Guid? ParentId);
