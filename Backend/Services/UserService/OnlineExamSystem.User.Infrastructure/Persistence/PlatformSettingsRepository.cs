using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Infrastructure.Persistence;

public class PlatformSettingsRepository : IPlatformSettingsRepository
{
    private readonly UserDbContext _dbContext;

    public PlatformSettingsRepository(UserDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<PlatformSettings?> GetAsync(CancellationToken cancellationToken = default) =>
        _dbContext.PlatformSettings.FirstOrDefaultAsync(cancellationToken);

    public async Task<PlatformSettings> GetOrCreateAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.PlatformSettings.FirstOrDefaultAsync(cancellationToken);
        if (settings is null)
        {
            settings = new PlatformSettings();
            await _dbContext.PlatformSettings.AddAsync(settings, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return settings;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
