using Azure.Messaging.ServiceBus;
using Azure.Messaging.ServiceBus.Administration;
using Microsoft.Extensions.Options;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Events.Exam;

namespace OnlineExamSystem.NotificationService.Worker;

public class ServiceBusExamReminderConsumer : BackgroundService
{
    private const string SubscriptionName = "notification-service.exam-reminder-events";

    private readonly ServiceBusSettings _settings;
    private readonly ILogger<ServiceBusExamReminderConsumer> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private ServiceBusClient? _client;
    private ServiceBusProcessor? _processor;

    public ServiceBusExamReminderConsumer(
        IOptions<ServiceBusSettings> settings,
        ILogger<ServiceBusExamReminderConsumer> logger,
        IServiceScopeFactory scopeFactory)
    {
        _settings = settings.Value;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var adminClient = new ServiceBusAdministrationClient(_settings.ConnectionString);
        if (!await adminClient.TopicExistsAsync(_settings.TopicName, stoppingToken))
        {
            await adminClient.CreateTopicAsync(_settings.TopicName, stoppingToken);
        }
        if (!await adminClient.SubscriptionExistsAsync(_settings.TopicName, SubscriptionName, stoppingToken))
        {
            await adminClient.CreateSubscriptionAsync(_settings.TopicName, SubscriptionName, stoppingToken);
        }

        _client = new ServiceBusClient(_settings.ConnectionString);
        _processor = _client.CreateProcessor(_settings.TopicName, SubscriptionName, new ServiceBusProcessorOptions
        {
            AutoCompleteMessages = true,
        });

        _processor.ProcessMessageAsync += HandleMessageAsync;
        _processor.ProcessErrorAsync += args =>
        {
            _logger.LogError(args.Exception, "Service Bus processing error for subscription {Subscription}", SubscriptionName);
            return Task.CompletedTask;
        };

        await _processor.StartProcessingAsync(stoppingToken);
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task HandleMessageAsync(ProcessMessageEventArgs args)
    {
        if (!args.Message.ApplicationProperties.TryGetValue("Type", out var typeValue)
            || typeValue?.ToString() != nameof(ExamReminderDueEvent))
        {
            return;
        }

        var reminder = args.Message.Body.ToObjectFromJson<ExamReminderDueEvent>();
        if (reminder is null || reminder.Targets.Count == 0)
        {
            return;
        }

        _logger.LogInformation(
            "ExamReminderDueEvent received: ExamId={ExamId}, AssignmentId={AssignmentId}, Window={Window}, TargetCount={TargetCount}",
            reminder.ExamId, reminder.AssignmentId, reminder.Window, reminder.Targets.Count);

        using var scope = _scopeFactory.CreateScope();
        var persistenceService = scope.ServiceProvider.GetRequiredService<INotificationPersistenceService>();

        var recipients = reminder.Targets
            .Select(t => new NotificationRecipient(t.UserId, t.Email, t.FullName))
            .ToList();

        var windowText = reminder.Window == ReminderWindow.TwentyFourHour ? "24 hours" : "1 hour";

        await persistenceService.CreateNotificationsAsync(
            tenantId: reminder.TenantId,
            batchId: Guid.NewGuid(),
            recipients: recipients,
            type: NotificationType.Reminder,
            title: $"Exam Reminder: {reminder.ExamTitle}",
            message: $"Your exam \"{reminder.ExamTitle}\" starts in {windowText}. Please make sure you're ready to begin on time.",
            relatedExamId: reminder.ExamId,
            cancellationToken: args.CancellationToken);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_processor is not null)
        {
            await _processor.StopProcessingAsync(cancellationToken);
            await _processor.DisposeAsync();
        }
        if (_client is not null)
        {
            await _client.DisposeAsync();
        }
        await base.StopAsync(cancellationToken);
    }
}
