namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record OrganizationAcademicConfigResponse(
    Dictionary<string, string> AcademicFields,
    List<string> ResultFields,
    DateTime? UpdatedAtUtc);
