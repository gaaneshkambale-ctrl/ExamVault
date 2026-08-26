using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Shared.Events.Exam;
using OnlineExamSystem.Shared.Events.Publishing;
using DomainReminderWindow = OnlineExamSystem.Exam.Domain.Enums.ReminderWindow;
using EventReminderWindow = OnlineExamSystem.Shared.Events.Exam.ReminderWindow;

namespace OnlineExamSystem.Exam.API.Jobs;

/// <summary>Polls for assignments entering the 24-hour or 1-hour reminder window and publishes one
/// ExamReminderDueEvent per assignment for whichever targets haven't already had that window's
/// reminder logged - see ActionPlan.txt's "POST-PHASE-9 FEATURE: Automatic Exam Reminder" note.</summary>
public class ExamReminderCheckService : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromMinutes(5);

    private static readonly (DomainReminderWindow Window, TimeSpan Lead)[] Windows =
    [
        (DomainReminderWindow.TwentyFourHour, TimeSpan.FromHours(24)),
        (DomainReminderWindow.OneHour, TimeSpan.FromHours(1)),
    ];

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IEventPublisher _eventPublisher;
    private readonly ILogger<ExamReminderCheckService> _logger;

    public ExamReminderCheckService(
        IServiceScopeFactory scopeFactory,
        IEventPublisher eventPublisher,
        ILogger<ExamReminderCheckService> logger)
    {
        _scopeFactory = scopeFactory;
        _eventPublisher = eventPublisher;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(PollInterval);
        do
        {
            try
            {
                await CheckOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exam reminder check failed.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task CheckOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var examRepository = scope.ServiceProvider.GetRequiredService<IExamRepository>();
        var userLookupClient = scope.ServiceProvider.GetRequiredService<IInternalUserLookupClient>();

        var now = DateTime.UtcNow;

        foreach (var (window, lead) in Windows)
        {
            // Candidates span every tenant (the job has no current-tenant context of its own),
            // so each tenant's own ReminderSettings must be checked individually rather than
            // once globally - two tenants can have this window enabled differently.
            var assignments = await examRepository.GetAssignmentsStartingWithinAsync(
                now, now + lead, cancellationToken);

            foreach (var tenantGroup in assignments.GroupBy(a => a.TenantId))
            {
                var settings = await examRepository.GetOrCreateReminderSettingsForTenantAsync(
                    tenantGroup.Key, cancellationToken);
                var windowEnabled = window == DomainReminderWindow.TwentyFourHour
                    ? settings.Enable24HourReminder
                    : settings.Enable1HourReminder;
                if (!windowEnabled)
                {
                    continue;
                }

                foreach (var assignment in tenantGroup)
                {
                    if (assignment.TargetUserIds.Count == 0)
                    {
                        continue;
                    }

                    var dueUserIds = await examRepository.FilterUserIdsWithoutReminderLogAsync(
                        assignment.AssignmentId, window, assignment.TargetUserIds, cancellationToken);
                    if (dueUserIds.Count == 0)
                    {
                        continue;
                    }

                    await examRepository.AddReminderLogEntriesAsync(
                        tenantGroup.Key, assignment.AssignmentId, window, dueUserIds, cancellationToken);
                    await examRepository.SaveChangesAsync(cancellationToken);

                    var targetUsers = await userLookupClient.GetUsersByIdsAsync(dueUserIds, cancellationToken);
                    if (targetUsers.Count == 0)
                    {
                        continue;
                    }

                    await _eventPublisher.PublishAsync(
                        new ExamReminderDueEvent
                        {
                            TenantId = tenantGroup.Key,
                            ExamId = assignment.ExamId,
                            AssignmentId = assignment.AssignmentId,
                            ExamTitle = assignment.ExamTitle,
                            StartAtUtc = assignment.StartAtUtc,
                            Window = window == DomainReminderWindow.TwentyFourHour
                                ? EventReminderWindow.TwentyFourHour
                                : EventReminderWindow.OneHour,
                            Targets = targetUsers
                                .Select(u => new AssignedUserInfo { UserId = u.Id, Email = u.Email, FullName = u.FullName })
                                .ToList(),
                        },
                        cancellationToken);

                    _logger.LogInformation(
                        "Published ExamReminderDueEvent for assignment {AssignmentId} ({Window}), {Count} targets.",
                        assignment.AssignmentId, window, targetUsers.Count);
                }
            }
        }
    }
}
