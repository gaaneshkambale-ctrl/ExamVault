namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record UpdateUserPreferencesRequest(string Language, string Timezone, string DateFormat, string TimeFormat);
