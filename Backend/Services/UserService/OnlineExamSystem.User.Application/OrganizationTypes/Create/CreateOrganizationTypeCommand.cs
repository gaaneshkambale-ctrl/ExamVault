namespace OnlineExamSystem.User.Application.OrganizationTypes.Create;

public record CreateOrganizationTypeCommand(
    string Name,
    int SortOrder = 0,
    Guid? CreatedByUserId = null);
