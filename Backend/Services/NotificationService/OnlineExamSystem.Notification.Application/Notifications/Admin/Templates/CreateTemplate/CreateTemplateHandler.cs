using FluentValidation;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.CreateTemplate;

public class CreateTemplateHandler
{
    private readonly INotificationTemplateRepository _repository;
    private readonly IValidator<CreateTemplateCommand> _validator;

    public CreateTemplateHandler(INotificationTemplateRepository repository, IValidator<CreateTemplateCommand> validator)
    {
        _repository = repository;
        _validator = validator;
    }

    public async Task<CreateTemplateResult> HandleAsync(
        CreateTemplateCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return CreateTemplateResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var now = DateTime.UtcNow;
        var template = new NotificationTemplate
        {
            Name = command.Name,
            Type = Enum.Parse<NotificationType>(command.Type, ignoreCase: true),
            SendEmail = command.SendEmail,
            SendInApp = command.SendInApp,
            Subject = command.Subject,
            Body = command.Body,
            IsActive = command.IsActive,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        };

        await _repository.AddAsync(template, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return CreateTemplateResult.Ok(template);
    }
}
