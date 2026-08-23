using Azure.Messaging.ServiceBus;
using Azure.Messaging.ServiceBus.Administration;
using Microsoft.Extensions.Options;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Events.Exam;

namespace OnlineExamSystem.NotificationService.Worker;

public class ServiceBusExamAssignedConsumer : BackgroundService
{
    private const string SubscriptionName = "notification-service.exam-assigned-events";

    private readonly ServiceBusSettings _settings;
    private readonly ILogger<ServiceBusExamAssignedConsumer> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private ServiceBusClient? _client;
    private ServiceBusProcessor? _processor;

    public ServiceBusExamAssignedConsumer(
        IOptions<ServiceBusSettings> settings,
        ILogger<ServiceBusExamAssignedConsumer> logger,
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
            || typeValue?.ToString() != nameof(ExamAssignedEvent))
        {
            return;
        }

        var examAssigned = args.Message.Body.ToObjectFromJson<ExamAssignedEvent>();
        if (examAssigned is null || examAssigned.Targets.Count == 0)
        {
            return;
        }

        _logger.LogInformation(
            "ExamAssignedEvent received: ExamId={ExamId}, ExamTitle={ExamTitle}, TargetCount={TargetCount}",
            examAssigned.ExamId, examAssigned.ExamTitle, examAssigned.Targets.Count);

        using var scope = _scopeFactory.CreateScope();
        var persistenceService = scope.ServiceProvider.GetRequiredService<INotificationPersistenceService>();

        var recipients = examAssigned.Targets
            .Select(t => new NotificationRecipient(t.UserId, t.Email, t.FullName))
            .ToList();

        await persistenceService.CreateNotificationsAsync(
            tenantId: examAssigned.TenantId,
            batchId: Guid.NewGuid(),
            recipients: recipients,
            type: NotificationType.Exam,
            title: $"New Exam Assigned: {examAssigned.ExamTitle}",
            message: $"You've been assigned to \"{examAssigned.ExamTitle}\". Please check your exams list for details.",
            relatedExamId: examAssigned.ExamId,
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
