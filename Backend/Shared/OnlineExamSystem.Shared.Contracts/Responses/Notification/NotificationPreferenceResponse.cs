namespace OnlineExamSystem.Shared.Contracts.Responses.Notification;

public record NotificationPreferenceResponse(string Type, bool InAppEnabled, bool EmailEnabled);
