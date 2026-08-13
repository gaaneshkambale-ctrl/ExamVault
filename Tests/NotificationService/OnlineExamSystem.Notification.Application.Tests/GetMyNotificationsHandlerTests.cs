using OnlineExamSystem.Notification.Application.Notifications.Mine.GetMyNotifications;
using OnlineExamSystem.Notification.Application.Tests.Fakes;
using OnlineExamSystem.Notification.Domain.Enums;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Application.Tests;

public class GetMyNotificationsHandlerTests
{
    [Fact]
    public async Task Only_returns_the_calling_users_own_notifications()
    {
        var repository = new FakeNotificationRepository();
        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();
        repository.Seed(new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = userA, Type = NotificationType.Account,
            Title = "A1", Message = "A1",
        });
        repository.Seed(new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = userB, Type = NotificationType.Account,
            Title = "B1", Message = "B1",
        });
        var handler = new GetMyNotificationsHandler(repository);

        var (items, totalCount) = await handler.HandleAsync(
            new GetMyNotificationsQuery(userA, UnreadOnly: false, Page: 1, PageSize: 20));

        Assert.Equal(1, totalCount);
        Assert.Single(items);
        Assert.Equal(userA, items[0].UserId);
    }

    [Fact]
    public async Task Excludes_not_yet_due_scheduled_notifications()
    {
        var repository = new FakeNotificationRepository();
        var userId = Guid.NewGuid();
        repository.Seed(new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = userId, Type = NotificationType.System,
            Title = "Future", Message = "Future", ScheduledAtUtc = DateTime.UtcNow.AddDays(1),
        });
        repository.Seed(new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = userId, Type = NotificationType.System,
            Title = "Due", Message = "Due", ScheduledAtUtc = DateTime.UtcNow.AddDays(-1),
        });
        var handler = new GetMyNotificationsHandler(repository);

        var (items, totalCount) = await handler.HandleAsync(
            new GetMyNotificationsQuery(userId, UnreadOnly: false, Page: 1, PageSize: 20));

        Assert.Equal(1, totalCount);
        Assert.Equal("Due", items[0].Title);
    }
}
