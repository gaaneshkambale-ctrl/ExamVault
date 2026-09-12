using FluentValidation;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.CreateNotification;

public class CreateNotificationHandler
{
    private readonly IUserDirectoryClient _userDirectoryClient;
    private readonly IExamAssignmentLookupClient _examAssignmentLookupClient;
    private readonly IExamLookupClient _examLookupClient;
    private readonly INotificationPersistenceService _persistenceService;
    private readonly IValidator<CreateNotificationCommand> _validator;

    public CreateNotificationHandler(
        IUserDirectoryClient userDirectoryClient,
        IExamAssignmentLookupClient examAssignmentLookupClient,
        IExamLookupClient examLookupClient,
        INotificationPersistenceService persistenceService,
        IValidator<CreateNotificationCommand> validator)
    {
        _userDirectoryClient = userDirectoryClient;
        _examAssignmentLookupClient = examAssignmentLookupClient;
        _examLookupClient = examLookupClient;
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

        // Instructor may only notify the candidates of an exam they created
        // themselves - RelatedExamId must be present and resolve to an exam
        // they own, AND SendTo must be ExamCandidates specifically (not
        // AllStudents/SelectedStudents/Admins - those would let an
        // Instructor broadcast to the whole tenant just by also naming an
        // exam they happen to own, which "Own Exam notifications" was never
        // meant to allow). Unlike the read-path "return empty" convention
        // used elsewhere this session, this is a write action, so a
        // mismatch is a real 403.
        if (command.OwnerUserId is { } ownerUserId)
        {
            if (command.RelatedExamId is not { } relatedExamId ||
                !string.Equals(command.SendTo, nameof(NotificationSendToType.ExamCandidates), StringComparison.OrdinalIgnoreCase))
            {
                return CreateNotificationResult.Forbidden();
            }

            var exam = await _examLookupClient.GetExamAsync(relatedExamId, command.BearerToken, cancellationToken);
            if (exam is null || exam.CreatedByUserId != ownerUserId)
            {
                return CreateNotificationResult.Forbidden();
            }
        }

        var sendTo = Enum.Parse<NotificationSendToType>(command.SendTo, ignoreCase: true);
        // Instructor has no "Users - View" permission, so GetAllUsersAsync
        // (GET /api/users) would 403 for them - the students-only endpoint
        // is the one they're authorized to call, and is also all an
        // Instructor's own-exam notification could ever need recipients
        // from (AllStudents/SelectedStudents/ExamCandidates are all
        // student audiences; "Admins" is Admin-only in practice since
        // OwnerUserId is never set for that path).
        var allUsers = command.OwnerUserId is not null
            ? await _userDirectoryClient.GetStudentsAsync(command.BearerToken, cancellationToken)
            : await _userDirectoryClient.GetAllUsersAsync(command.BearerToken, cancellationToken);

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
            command.TenantId,
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
