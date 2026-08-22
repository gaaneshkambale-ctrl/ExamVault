using FluentValidation;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.CreateNotification;

public class CreateNotificationHandler
{
    private readonly IUserDirectoryClient _userDirectoryClient;
    private readonly IExamAssignmentLookupClient _examAssignmentLookupClient;
    private readonly INotificationPersistenceService _persistenceService;
    private readonly IValidator<CreateNotificationCommand> _validator;

    public CreateNotificationHandler(
        IUserDirectoryClient userDirectoryClient,
        IExamAssignmentLookupClient examAssignmentLookupClient,
        INotificationPersistenceService persistenceService,
        IValidator<CreateNotificationCommand> validator)
    {
        _userDirectoryClient = userDirectoryClient;
        _examAssignmentLookupClient = examAssignmentLookupClient;
        _persistenceService = persistenceService;
        _validator = validator;
    }

    public async Task<CreateNotificationResult> HandleAsync(
        CreateNotificationCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return CreateNotificationResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var sendTo = Enum.Parse<NotificationSendToType>(command.SendTo, ignoreCase: true);
        var allUsers = await _userDirectoryClient.GetAllUsersAsync(command.BearerToken, cancellationToken);

        IEnumerable<UserDirectoryEntry> targets;
        switch (sendTo)
        {
            case NotificationSendToType.AllStudents:
                targets = allUsers.Where(u => string.Equals(u.Role, "Student", StringComparison.OrdinalIgnoreCase));
                break;

            case NotificationSendToType.Admins:
                targets = allUsers.Where(u => string.Equals(u.Role, "Admin", StringComparison.OrdinalIgnoreCase));
                break;

            case NotificationSendToType.SelectedStudents:
                var selectedIds = command.UserIds!.ToHashSet();
                targets = allUsers.Where(u => selectedIds.Contains(u.Id));
                break;

            case NotificationSendToType.ExamCandidates:
            default:
                var candidateIds = await _examAssignmentLookupClient.GetTargetUserIdsForExamAsync(
                    command.RelatedExamId!.Value, command.BearerToken, cancellationToken);
                var candidateIdSet = candidateIds.ToHashSet();
                targets = allUsers.Where(u => candidateIdSet.Contains(u.Id));
                break;
        }

        var recipients = targets
            .Select(u => new NotificationRecipient(u.Id, u.Email, u.FullName))
            .ToList();

        if (recipients.Count == 0)
        {
            return CreateNotificationResult.NoRecipients();
        }

        var type = Enum.Parse<NotificationType>(command.Type, ignoreCase: true);
        var scheduledAtUtc = command.SendNow ? null : command.ScheduledAtUtc;
        var batchId = Guid.NewGuid();

        await _persistenceService.CreateNotificationsAsync(
            batchId,
            recipients,
            type,
            command.Title,
            command.Message,
            command.RelatedExamId,
            command.AdminUserId,
            scheduledAtUtc,
            command.SendEmail,
            command.SendInApp,
            cancellationToken);

        return CreateNotificationResult.Ok(batchId, recipients.Count);
    }
}
