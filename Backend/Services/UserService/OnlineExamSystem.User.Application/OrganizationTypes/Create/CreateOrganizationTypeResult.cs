using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.OrganizationTypes.Create;

public class CreateOrganizationTypeResult
{
    public bool Success { get; init; }
    public bool NameAlreadyExists { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public OrganizationType? OrganizationType { get; init; }

    public static CreateOrganizationTypeResult Ok(OrganizationType organizationType) =>
        new() { Success = true, OrganizationType = organizationType };

    public static CreateOrganizationTypeResult Invalid(IReadOnlyList<string> errors) => new() { ValidationErrors = errors };

    public static CreateOrganizationTypeResult Conflict() => new() { NameAlreadyExists = true };
}
