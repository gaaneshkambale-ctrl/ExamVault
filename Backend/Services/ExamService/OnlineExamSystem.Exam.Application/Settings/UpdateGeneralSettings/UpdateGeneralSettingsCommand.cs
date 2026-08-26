namespace OnlineExamSystem.Exam.Application.Settings.UpdateGeneralSettings;

public record UpdateGeneralSettingsCommand(
    string OrganizationName,
    string SupportEmail,
    string Language,
    string Timezone,
    string DateFormat);
