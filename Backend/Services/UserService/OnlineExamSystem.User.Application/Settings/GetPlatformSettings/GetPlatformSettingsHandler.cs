using OnlineExamSystem.User.Application.Interfaces;
using PlatformSettingsEntity = OnlineExamSystem.User.Domain.Entities.PlatformSettings;

namespace OnlineExamSystem.User.Application.Settings.GetPlatformSettings;

public class GetPlatformSettingsHandler
{
    private readonly IPlatformSettingsRepository _repository;

    public GetPlatformSettingsHandler(IPlatformSettingsRepository repository)
    {
        _repository = repository;
    }

    public Task<PlatformSettingsEntity> HandleAsync(
        GetPlatformSettingsQuery query,
        CancellationToken cancellationToken = default) =>
        _repository.GetOrCreateAsync(cancellationToken);
}
