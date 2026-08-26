using OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistory;
using OnlineExamSystem.Notification.Application.Tests.Fakes;
using OnlineExamSystem.Notification.Domain.Enums;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Application.Tests;

public class GetNotificationHistoryHandlerTests
{
    [Fact]
    public async Task Groups_per_recipient_rows_into_one_batch_summary()
    {
        var repository = new FakeNotificationRepository();
        var batchId = Guid.NewGuid();
        var admin = Guid.NewGuid();
        for (var i = 0; i < 3; i++)
        {
            repository.Seed(new NotificationEntity
            {
                BatchId = batchId,
                UserId = Guid.NewGuid(),
                Type = NotificationType.System,
                Title = "System Maintenance",
                Message = "...",
                CreatedByAdminUserId = admin,
            });
        }
        var handler = new GetNotificationHistoryHandler(repository);

        var (items, totalCount) = await handler.HandleAsync(new GetNotificationHistoryQuery(null, 1, 20));

        Assert.Equal(1, totalCount);
        Assert.Equal(3, items[0].RecipientCount);
        Assert.Equal("System Maintenance", items[0].Title);
    }

    [Fact]
    public async Task Different_batches_produce_separate_summaries()
    {
        var repository = new FakeNotificationRepository();
        repository.Seed(new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = Guid.NewGuid(), Type = NotificationType.Exam,
            Title = "Batch 1", Message = "...",
        });
        repository.Seed(new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = Guid.NewGuid(), Type = NotificationType.Account,
            Title = "Batch 2", Message = "...",
        });
        var handler = new GetNotificationHistoryHandler(repository);

        var (items, totalCount) = await handler.HandleAsync(new GetNotificationHistoryQuery(null, 1, 20));

        Assert.Equal(2, totalCount);
        Assert.All(items, i => Assert.Equal(1, i.RecipientCount));
    }

    [Fact]
    public async Task Type_filter_only_returns_matching_batches()
    {
        var repository = new FakeNotificationRepository();
        repository.Seed(new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = Guid.NewGuid(), Type = NotificationType.Exam,
            Title = "Exam Batch", Message = "...",
        });
        repository.Seed(new NotificationEntity
        {
            BatchId = Guid.NewGuid(), UserId = Guid.NewGuid(), Type = NotificationType.Account,
            Title = "Account Batch", Message = "...",
        });
        var handler = new GetNotificationHistoryHandler(repository);

        var (items, totalCount) = await handler.HandleAsync(
            new GetNotificationHistoryQuery(NotificationType.Exam, 1, 20));

        Assert.Equal(1, totalCount);
        Assert.Equal("Exam Batch", items[0].Title);
    }
}
