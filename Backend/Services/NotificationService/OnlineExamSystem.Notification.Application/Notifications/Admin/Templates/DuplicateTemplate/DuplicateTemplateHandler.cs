using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.DuplicateTemplate;

public class DuplicateTemplateHandler
{
    private readonly INotificationTemplateRepository _repository;

    public DuplicateTemplateHandler(INotificationTemplateRepository repository)
    {
        _repository = repository;
    }

    public async Task<DuplicateTemplateResult> HandleAsync(
        DuplicateTemplateCommand command,
        CancellationToken cancellationToken = default)
    {
        var source = await _repository.GetByIdAsync(command.Id, cancellationToken);
        if (source is null)
        {
            return DuplicateTemplateResult.NotFound();
        }

        var now = DateTime.UtcNow;
        var copy = new NotificationTemplate
        {
            Name = $"{source.Name} (Copy)",
            Type = source.Type,
            SendEmail = source.SendEmail,
            SendInApp = source.SendInApp,
            Subject = source.Subject,
            Body = source.Body,
            IsActive = false,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        };

        await _repository.AddAsync(copy, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return DuplicateTemplateResult.Ok(copy);
    }
}
