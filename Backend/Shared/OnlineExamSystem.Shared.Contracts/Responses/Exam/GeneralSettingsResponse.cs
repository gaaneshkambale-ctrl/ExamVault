namespace OnlineExamSystem.Shared.Contracts.Responses.Exam;

public record GeneralSettingsResponse(
    string OrganizationName,
    string SupportEmail,
    string Language,
    string Timezone,
    string DateFormat,
    DateTime UpdatedAtUtc);
