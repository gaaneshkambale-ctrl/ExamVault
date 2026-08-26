using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Infrastructure.Persistence;

public class NotificationTemplateRepository : INotificationTemplateRepository
{
    private readonly NotificationDbContext _dbContext;

    public NotificationTemplateRepository(NotificationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<NotificationTemplate>> ListAsync(
        string? search,
        NotificationType? type,
        string? channel,
        string? status,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.NotificationTemplates.AsQueryable();

        if (type.HasValue)
        {
            query = query.Where(t => t.Type == type.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(t => t.Name.Contains(search) || t.Subject.Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var isActive = string.Equals(status, "Active", StringComparison.OrdinalIgnoreCase);
            query = query.Where(t => t.IsActive == isActive);
        }

        var items = await query.OrderByDescending(t => t.UpdatedAtUtc).ToListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(channel))
        {
            items = items.Where(t =>
            {
                var channelLabel = (t.SendInApp, t.SendEmail) switch
                {
                    (true, true) => "InAppEmail",
                    (true, false) => "InApp",
                    (false, true) => "Email",
                    _ => "None",
                };
                return string.Equals(channel, channelLabel, StringComparison.OrdinalIgnoreCase);
            }).ToList();
        }

        return items;
    }

    public Task<NotificationTemplate?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.NotificationTemplates.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public Task AddAsync(NotificationTemplate template, CancellationToken cancellationToken = default)
    {
        _dbContext.NotificationTemplates.Add(template);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
