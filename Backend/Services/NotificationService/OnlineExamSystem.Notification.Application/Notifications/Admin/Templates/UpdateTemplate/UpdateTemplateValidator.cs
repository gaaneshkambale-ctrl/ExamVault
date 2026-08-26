using FluentValidation;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.UpdateTemplate;

public class UpdateTemplateValidator : AbstractValidator<UpdateTemplateCommand>
{
    public UpdateTemplateValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Type).IsEnumName(typeof(NotificationType), caseSensitive: false);
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Body).NotEmpty().MaximumLength(2000);
        RuleFor(x => x)
            .Must(x => x.SendEmail || x.SendInApp)
            .WithMessage("Select at least one delivery channel.");
    }
}
