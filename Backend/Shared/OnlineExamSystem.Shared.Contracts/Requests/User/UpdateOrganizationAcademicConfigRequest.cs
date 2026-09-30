namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record UpdateOrganizationAcademicConfigRequest(
    Dictionary<string, string> AcademicFields,
    List<string> ResultFields);
