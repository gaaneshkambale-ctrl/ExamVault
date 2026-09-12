namespace OnlineExamSystem.User.Application.Settings.GetEmailSummary;

public record EmailSummaryResult(int SentToday, int DeliveredToday, int FailedToday, double? DeliveryRatePercent);
