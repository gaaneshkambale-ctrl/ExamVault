namespace OnlineExamSystem.Shared.Contracts.Requests.Exam;

public record UpdateGeneralSettingsRequest(
    string OrganizationName,
    string SupportEmail,
    string Language,
    string Timezone,
    string DateFormat);
