using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Interfaces;

public interface INotificationTemplateRepository
{
    Task<IReadOnlyList<NotificationTemplate>> ListAsync(
        string? search,
        NotificationType? type,
        string? channel,
        string? status,
        CancellationToken cancellationToken = default);

    Task<NotificationTemplate?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task AddAsync(NotificationTemplate template, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
