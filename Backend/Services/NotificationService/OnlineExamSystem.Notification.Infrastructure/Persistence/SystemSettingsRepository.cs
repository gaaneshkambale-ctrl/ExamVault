using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Infrastructure.Persistence;

public class SystemSettingsRepository : ISystemSettingsRepository
{
    private readonly NotificationDbContext _dbContext;

    public SystemSettingsRepository(NotificationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<SystemSettings> GetOrCreateAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.SystemSettings.FirstOrDefaultAsync(cancellationToken);
        if (settings is null)
        {
            settings = new SystemSettings();
            await _dbContext.SystemSettings.AddAsync(settings, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return settings;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
