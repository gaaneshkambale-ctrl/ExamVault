using OnlineExamSystem.User.Application.Interfaces;
using PlatformSettingsEntity = OnlineExamSystem.User.Domain.Entities.PlatformSettings;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakePlatformSettingsRepository : IPlatformSettingsRepository
{
    public PlatformSettingsEntity? Settings { get; set; }

    public Task<PlatformSettingsEntity?> GetAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(Settings);

    public Task<PlatformSettingsEntity> GetOrCreateAsync(CancellationToken cancellationToken = default)
    {
        Settings ??= new PlatformSettingsEntity();
        return Task.FromResult(Settings);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
