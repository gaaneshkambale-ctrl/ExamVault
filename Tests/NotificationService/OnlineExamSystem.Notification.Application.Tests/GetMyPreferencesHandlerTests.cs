using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Application.Notifications.Mine.Preferences;
using OnlineExamSystem.Notification.Application.Tests.Fakes;
using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Tests;

public class GetMyPreferencesHandlerTests
{
    [Fact]
    public async Task No_saved_rows_defaults_every_type_to_in_app_and_email_enabled()
    {
        var repository = new FakeNotificationRepository();
        var handler = new GetMyPreferencesHandler(repository, new FakeNotificationDefaultsClient());

        var items = await handler.HandleAsync(new GetMyPreferencesQuery(Guid.NewGuid()));

        Assert.Equal(Enum.GetValues<NotificationType>().Length, items.Count);
        Assert.All(items, i => Assert.True(i.InAppEnabled));
        Assert.All(items, i => Assert.True(i.EmailEnabled));
    }

    [Fact]
    public async Task A_saved_row_overrides_the_default_for_that_type_only()
    {
        var repository = new FakeNotificationRepository();
        var userId = Guid.NewGuid();
        repository.Seed(new NotificationPreference
        {
            UserId = userId, Type = NotificationType.Exam, InAppEnabled = true, EmailEnabled = false,
        });
        var handler = new GetMyPreferencesHandler(repository, new FakeNotificationDefaultsClient());

        var items = await handler.HandleAsync(new GetMyPreferencesQuery(userId));

        var exam = items.Single(i => i.Type == NotificationType.Exam);
        Assert.False(exam.EmailEnabled);
        var result = items.Single(i => i.Type == NotificationType.Result);
        Assert.True(result.EmailEnabled);
    }

    [Fact]
    public async Task Platform_wide_defaults_apply_to_every_type_the_user_never_saved_a_preference_for()
    {
        var repository = new FakeNotificationRepository();
        var defaultsClient = new FakeNotificationDefaultsClient { Defaults = new NotificationDefaults(false, false) };
        var handler = new GetMyPreferencesHandler(repository, defaultsClient);

        var items = await handler.HandleAsync(new GetMyPreferencesQuery(Guid.NewGuid()));

        Assert.All(items, i => Assert.False(i.InAppEnabled));
        Assert.All(items, i => Assert.False(i.EmailEnabled));
    }
}
