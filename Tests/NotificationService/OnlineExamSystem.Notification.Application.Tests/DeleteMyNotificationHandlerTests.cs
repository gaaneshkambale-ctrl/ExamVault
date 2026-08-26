using OnlineExamSystem.Notification.Application.Notifications.Mine.DeleteMyNotification;
using OnlineExamSystem.Notification.Application.Tests.Fakes;
using OnlineExamSystem.Notification.Domain.Enums;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Application.Tests;

public class DeleteMyNotificationHandlerTests
{
    [Fact]
    public async Task Owner_can_delete_their_own_notification()
    {
        var repository = new FakeNotificationRepository();
        var userId = Guid.NewGuid();
        var notification = new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = userId, Type = NotificationType.Account,
            Title = "T", Message = "M",
        };
        repository.Seed(notification);
        var handler = new DeleteMyNotificationHandler(repository);

        var result = await handler.HandleAsync(new DeleteMyNotificationCommand(notification.Id, userId));

        Assert.True(result.Success);
        Assert.Empty(repository.Notifications);
    }

    [Fact]
    public async Task Non_owner_gets_forbidden_and_the_row_survives()
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
        var handler = new DeleteMyNotificationHandler(repository);

        var result = await handler.HandleAsync(new DeleteMyNotificationCommand(notification.Id, intruder));

        Assert.True(result.IsForbidden);
        Assert.Single(repository.Notifications);
    }
}
