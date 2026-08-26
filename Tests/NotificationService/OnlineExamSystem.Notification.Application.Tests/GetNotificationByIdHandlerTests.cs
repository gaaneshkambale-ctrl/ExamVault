using OnlineExamSystem.Notification.Application.Notifications.Mine.GetNotificationById;
using OnlineExamSystem.Notification.Application.Tests.Fakes;
using OnlineExamSystem.Notification.Domain.Enums;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Application.Tests;

public class GetNotificationByIdHandlerTests
{
    [Fact]
    public async Task Owner_can_fetch_their_own_notification()
    {
        var repository = new FakeNotificationRepository();
        var userId = Guid.NewGuid();
        var notification = new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = userId, Type = NotificationType.Account,
            Title = "T", Message = "M",
        };
        repository.Seed(notification);
        var handler = new GetNotificationByIdHandler(repository);

        var result = await handler.HandleAsync(new GetNotificationByIdQuery(notification.Id, userId));

        Assert.True(result.Success);
        Assert.Equal(notification.Id, result.Notification!.Id);
    }

    [Fact]
    public async Task Non_owner_gets_forbidden()
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
        var handler = new GetNotificationByIdHandler(repository);

        var result = await handler.HandleAsync(new GetNotificationByIdQuery(notification.Id, intruder));

        Assert.True(result.IsForbidden);
    }

    [Fact]
    public async Task Unknown_id_returns_not_found()
    {
        var repository = new FakeNotificationRepository();
        var handler = new GetNotificationByIdHandler(repository);

        var result = await handler.HandleAsync(new GetNotificationByIdQuery(Guid.NewGuid(), Guid.NewGuid()));

        Assert.True(result.IsNotFound);
    }
}
