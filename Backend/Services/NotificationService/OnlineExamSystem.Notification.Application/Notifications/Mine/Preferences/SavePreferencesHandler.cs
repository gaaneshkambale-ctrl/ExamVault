using FluentValidation;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Application.Notifications.Mine.Preferences;

public class SavePreferencesHandler
{
    private readonly INotificationRepository _repository;
    private readonly IValidator<SavePreferencesCommand> _validator;

    public SavePreferencesHandler(INotificationRepository repository, IValidator<SavePreferencesCommand> validator)
    {
        _repository = repository;
        _validator = validator;
    }

    public async Task<SavePreferencesResult> HandleAsync(
        SavePreferencesCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return SavePreferencesResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        foreach (var item in command.Preferences)
        {
            var existing = await _repository.GetPreferenceAsync(command.UserId, item.Type, cancellationToken);
            if (existing is null)
            {
                await _repository.UpsertPreferenceAsync(
                    new NotificationPreference
                    {
                        UserId = command.UserId,
                        Type = item.Type,
                        InAppEnabled = item.InAppEnabled,
                        EmailEnabled = item.EmailEnabled,
                    },
                    cancellationToken);
            }
            else
            {
                existing.InAppEnabled = item.InAppEnabled;
                existing.EmailEnabled = item.EmailEnabled;
            }
        }

        await _repository.SaveChangesAsync(cancellationToken);

        return SavePreferencesResult.Ok();
    }
}
