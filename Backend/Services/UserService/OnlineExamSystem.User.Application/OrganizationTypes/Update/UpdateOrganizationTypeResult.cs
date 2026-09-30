using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.OrganizationTypes.Update;

public class UpdateOrganizationTypeResult
{
    public bool Success { get; init; }
    public bool NotFound { get; init; }
    public bool NameAlreadyExists { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public OrganizationType? OrganizationType { get; init; }

    public static UpdateOrganizationTypeResult Ok(OrganizationType organizationType) =>
        new() { Success = true, OrganizationType = organizationType };

    public static UpdateOrganizationTypeResult Invalid(IReadOnlyList<string> errors) => new() { ValidationErrors = errors };

    public static UpdateOrganizationTypeResult NoType() => new() { NotFound = true };

    public static UpdateOrganizationTypeResult Conflict() => new() { NameAlreadyExists = true };
}
