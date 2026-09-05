using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Settings.GetEmailConnectionStatus;
using OnlineExamSystem.User.Application.Tests.Fakes;
using PlatformSettingsEntity = OnlineExamSystem.User.Domain.Entities.PlatformSettings;

namespace OnlineExamSystem.User.Application.Tests;

public class GetEmailConnectionStatusHandlerTests
{
    [Fact]
    public async Task No_webhook_configured_returns_not_configured_without_calling_the_checker()
    {
        var settingsRepository = new FakePlatformSettingsRepository { Settings = new PlatformSettingsEntity { N8nWebhookUrl = null } };
        var checker = new FakeEmailConnectionChecker { Result = EmailConnectionStatus.Reachable };
        var handler = new GetEmailConnectionStatusHandler(settingsRepository, checker);

        var status = await handler.HandleAsync(new GetEmailConnectionStatusQuery());

        Assert.Equal(EmailConnectionStatus.NotConfigured, status);
        Assert.Null(checker.LastCheckedUrl);
    }

    [Fact]
    public async Task Configured_webhook_delegates_to_the_connection_checker()
    {
        var settingsRepository = new FakePlatformSettingsRepository
        {
            Settings = new PlatformSettingsEntity { N8nWebhookUrl = "https://n8n.example.com/webhook/credential" },
        };
        var checker = new FakeEmailConnectionChecker { Result = EmailConnectionStatus.Unreachable };
        var handler = new GetEmailConnectionStatusHandler(settingsRepository, checker);

        var status = await handler.HandleAsync(new GetEmailConnectionStatusQuery());

        Assert.Equal(EmailConnectionStatus.Unreachable, status);
        Assert.Equal("https://n8n.example.com/webhook/credential", checker.LastCheckedUrl);
    }
}
