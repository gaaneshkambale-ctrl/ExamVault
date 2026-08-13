namespace OnlineExamSystem.Shared.Contracts.Requests.Notification;

public record NotificationPreferenceItemRequest(string Type, bool InAppEnabled, bool EmailEnabled);

public record SavePreferencesRequest(IReadOnlyList<NotificationPreferenceItemRequest> Preferences);
