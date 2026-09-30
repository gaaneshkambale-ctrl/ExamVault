namespace OnlineExamSystem.User.Application.OrganizationTypes.Update;

public record UpdateOrganizationTypeCommand(
    Guid OrganizationTypeId,
    string Name,
    bool IsActive,
    int SortOrder,
    Guid? UpdatedByUserId = null);
