using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.ListTemplates;

public class ListTemplatesHandler
{
    private readonly INotificationTemplateRepository _repository;

    public ListTemplatesHandler(INotificationTemplateRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<NotificationTemplate>> HandleAsync(
        ListTemplatesQuery query,
        CancellationToken cancellationToken = default) =>
        _repository.ListAsync(query.Search, query.Type, query.Channel, query.Status, cancellationToken);
}
