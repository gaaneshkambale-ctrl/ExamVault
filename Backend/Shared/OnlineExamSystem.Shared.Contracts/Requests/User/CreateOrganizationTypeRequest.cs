namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record CreateOrganizationTypeRequest(string Name, int SortOrder = 0);
