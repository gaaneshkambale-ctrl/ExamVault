using OnlineExamSystem.Notification.Application.Notifications.Mine.MarkAsRead;
using OnlineExamSystem.Notification.Application.Tests.Fakes;
using OnlineExamSystem.Notification.Domain.Enums;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Application.Tests;

public class MarkAsReadHandlerTests
{
    [Fact]
    public async Task Owner_can_mark_their_own_notification_read()
    {
        var repository = new FakeNotificationRepository();
        var userId = Guid.NewGuid();
        var notification = new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = userId, Type = NotificationType.Account,
            Title = "T", Message = "M",
        };
        repository.Seed(notification);
        var handler = new MarkAsReadHandler(repository);

        var result = await handler.HandleAsync(new MarkAsReadCommand(notification.Id, userId));

        Assert.True(result.Success);
        Assert.True(notification.IsRead);
    }

    [Fact]
    public async Task Non_owner_gets_forbidden_and_the_row_is_left_unread()
    {
        var repository = new FakeNotificationRepository();
        var owner = Guid.NewGuid();
        var intruder = Guid.NewGuid();
        var notification = new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = owner, Type = NotificationType.Account,
            Title = "T", Message = "M",
        };
        repository.Seed(notification);
        var handler = new MarkAsReadHandler(repository);

        var result = await handler.HandleAsync(new MarkAsReadCommand(notification.Id, intruder));

        Assert.True(result.IsForbidden);
        Assert.False(notification.IsRead);
    }

    [Fact]
    public async Task Unknown_id_returns_not_found()
    {
        var repository = new FakeNotificationRepository();
        var handler = new MarkAsReadHandler(repository);

        var result = await handler.HandleAsync(new MarkAsReadCommand(Guid.NewGuid(), Guid.NewGuid()));

        Assert.True(result.IsNotFound);
    }
}
