using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Tests.Fakes;

public class FakeNotificationDefaultsClient : INotificationDefaultsClient
{
    public NotificationDefaults Defaults { get; set; } = new(true, true);

    public Task<NotificationDefaults> GetDefaultsAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(Defaults);
}
