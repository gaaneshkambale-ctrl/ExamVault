namespace OnlineExamSystem.Shared.Contracts.Responses.User;

public record EmailSummaryResponse(int SentToday, int DeliveredToday, int FailedToday, double? DeliveryRatePercent);
