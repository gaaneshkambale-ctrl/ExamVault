namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record UserPreferencesResponse(
    string Language,
    string Timezone,
    string DateFormat,
    string TimeFormat,
    string Theme = "System");
