using OnlineExamSystem.Notification.Application.Interfaces;
using SystemSettingsEntity = OnlineExamSystem.Notification.Domain.Entities.SystemSettings;

namespace OnlineExamSystem.Notification.Application.Settings.GetSystemSettings;

public class GetSystemSettingsHandler
{
    private readonly ISystemSettingsRepository _repository;

    public GetSystemSettingsHandler(ISystemSettingsRepository repository)
    {
        _repository = repository;
    }

    public Task<SystemSettingsEntity> HandleAsync(
        GetSystemSettingsQuery query,
        CancellationToken cancellationToken = default) =>
        _repository.GetOrCreateAsync(cancellationToken);
}
