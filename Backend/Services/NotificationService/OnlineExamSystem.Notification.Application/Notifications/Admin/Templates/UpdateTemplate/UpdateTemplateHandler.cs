using FluentValidation;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.UpdateTemplate;

public class UpdateTemplateHandler
{
    private readonly INotificationTemplateRepository _repository;
    private readonly IValidator<UpdateTemplateCommand> _validator;

    public UpdateTemplateHandler(INotificationTemplateRepository repository, IValidator<UpdateTemplateCommand> validator)
    {
        _repository = repository;
        _validator = validator;
    }

    public async Task<UpdateTemplateResult> HandleAsync(
        UpdateTemplateCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return UpdateTemplateResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var template = await _repository.GetByIdAsync(command.Id, cancellationToken);
        if (template is null)
        {
            return UpdateTemplateResult.NotFound();
        }

        template.Name = command.Name;
        template.Type = Enum.Parse<NotificationType>(command.Type, ignoreCase: true);
        template.SendEmail = command.SendEmail;
        template.SendInApp = command.SendInApp;
        template.Subject = command.Subject;
        template.Body = command.Body;
        template.IsActive = command.IsActive;
        template.UpdatedAtUtc = DateTime.UtcNow;

        await _repository.SaveChangesAsync(cancellationToken);

        return UpdateTemplateResult.Ok(template);
    }
}
