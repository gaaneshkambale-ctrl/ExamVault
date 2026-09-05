using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Settings.GetEmailConnectionStatus;

public class GetEmailConnectionStatusHandler
{
    private readonly IPlatformSettingsRepository _platformSettingsRepository;
    private readonly IEmailConnectionChecker _connectionChecker;

    public GetEmailConnectionStatusHandler(
        IPlatformSettingsRepository platformSettingsRepository,
        IEmailConnectionChecker connectionChecker)
    {
        _platformSettingsRepository = platformSettingsRepository;
        _connectionChecker = connectionChecker;
    }

    public async Task<EmailConnectionStatus> HandleAsync(
        GetEmailConnectionStatusQuery query,
        CancellationToken cancellationToken = default)
    {
        var platformSettings = await _platformSettingsRepository.GetAsync(cancellationToken);
        var webhookUrl = platformSettings?.N8nWebhookUrl;

        return string.IsNullOrWhiteSpace(webhookUrl)
            ? EmailConnectionStatus.NotConfigured
            : await _connectionChecker.CheckAsync(webhookUrl, cancellationToken);
    }
}
