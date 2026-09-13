namespace OnlineExamSystem.User.Application.Tenants.UpdateOrganizationAcademicConfig;

public class UpdateOrganizationAcademicConfigResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public Dictionary<string, string> AcademicFields { get; init; } = new();
    public List<string> ResultFields { get; init; } = new();
    public DateTime UpdatedAtUtc { get; init; }

    public static UpdateOrganizationAcademicConfigResult Ok(Dictionary<string, string> academicFields, List<string> resultFields, DateTime updatedAtUtc) =>
        new() { Success = true, AcademicFields = academicFields, ResultFields = resultFields, UpdatedAtUtc = updatedAtUtc };

    public static UpdateOrganizationAcademicConfigResult Invalid(IReadOnlyList<string> errors) => new() { ValidationErrors = errors };
}
