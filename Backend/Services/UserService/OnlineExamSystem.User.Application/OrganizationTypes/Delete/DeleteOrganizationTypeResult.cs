namespace OnlineExamSystem.User.Application.OrganizationTypes.Delete;

public class DeleteOrganizationTypeResult
{
    public bool Success { get; init; }
    public bool NotFound { get; init; }

    public static DeleteOrganizationTypeResult Ok() => new() { Success = true };

    public static DeleteOrganizationTypeResult NoType() => new() { NotFound = true };
}
