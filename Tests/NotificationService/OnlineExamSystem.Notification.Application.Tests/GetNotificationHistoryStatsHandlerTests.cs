using OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistoryStats;
using OnlineExamSystem.Notification.Application.Tests.Fakes;
using OnlineExamSystem.Notification.Domain.Enums;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Application.Tests;

public class GetNotificationHistoryStatsHandlerTests
{
    [Fact]
    public async Task Without_an_owner_counts_every_notification_tenant_wide()
    {
        var repository = new FakeNotificationRepository();
        repository.Seed(new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = Guid.NewGuid(), Type = NotificationType.Exam,
            Title = "A", Message = "...", RelatedExamId = Guid.NewGuid(), EmailStatus = EmailStatus.Delivered,
        });
        repository.Seed(new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = Guid.NewGuid(), Type = NotificationType.System,
            Title = "B", Message = "...", RelatedExamId = null, EmailStatus = EmailStatus.Delivered,
        });
        var handler = new GetNotificationHistoryStatsHandler(repository, new FakeExamLookupClient(null));

        var stats = await handler.HandleAsync(new GetNotificationHistoryStatsQuery());

        Assert.Equal(2, stats.Total);
        Assert.Equal(2, stats.Delivered);
    }

    [Fact]
    public async Task Owner_filter_only_counts_notifications_for_owned_exams()
    {
        var repository = new FakeNotificationRepository();
        var ownedExamId = Guid.NewGuid();
        repository.Seed(new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = Guid.NewGuid(), Type = NotificationType.Exam,
            Title = "My Exam", Message = "...", RelatedExamId = ownedExamId, EmailStatus = EmailStatus.Delivered,
        });
        repository.Seed(new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = Guid.NewGuid(), Type = NotificationType.Exam,
            Title = "Other Exam", Message = "...", RelatedExamId = Guid.NewGuid(), EmailStatus = EmailStatus.Delivered,
        });
        repository.Seed(new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = Guid.NewGuid(), Type = NotificationType.System,
            Title = "Broadcast", Message = "...", RelatedExamId = null, EmailStatus = EmailStatus.Delivered,
        });
        var examLookupClient = new FakeExamLookupClient(null, ownedExamIds: [ownedExamId]);
        var handler = new GetNotificationHistoryStatsHandler(repository, examLookupClient);

        var stats = await handler.HandleAsync(
            new GetNotificationHistoryStatsQuery(OwnerUserId: Guid.NewGuid(), BearerToken: "test-token"));

        Assert.Equal(1, stats.Total);
        Assert.Equal(1, stats.Delivered);
    }
}
