namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record UpdateOrganizationTypeRequest(string Name, bool IsActive, int SortOrder);
