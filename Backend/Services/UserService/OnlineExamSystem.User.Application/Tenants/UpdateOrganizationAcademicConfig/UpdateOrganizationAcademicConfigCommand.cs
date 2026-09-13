namespace OnlineExamSystem.User.Application.Tenants.UpdateOrganizationAcademicConfig;

public record UpdateOrganizationAcademicConfigCommand(
    Guid TenantId,
    Dictionary<string, string> AcademicFields,
    List<string> ResultFields,
    Guid? UpdatedByUserId);
