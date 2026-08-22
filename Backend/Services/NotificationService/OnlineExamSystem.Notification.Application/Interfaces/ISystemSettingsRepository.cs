using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Application.Interfaces;

public interface ISystemSettingsRepository
{
    /// <summary>Returns the single global SystemSettings row, creating it with the
    /// entity's own defaults if it doesn't exist yet.</summary>
    Task<SystemSettings> GetOrCreateAsync(CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
