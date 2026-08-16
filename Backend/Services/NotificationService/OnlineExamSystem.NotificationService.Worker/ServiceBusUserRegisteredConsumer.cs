using Azure.Messaging.ServiceBus;
using Azure.Messaging.ServiceBus.Administration;
using Microsoft.Extensions.Options;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Events.User;

namespace OnlineExamSystem.NotificationService.Worker;

public class ServiceBusUserRegisteredConsumer : BackgroundService
{
    private const string SubscriptionName = "notification-service.user-registered-events";

    private readonly ServiceBusSettings _settings;
    private readonly ILogger<ServiceBusUserRegisteredConsumer> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private ServiceBusClient? _client;
    private ServiceBusProcessor? _processor;

    public ServiceBusUserRegisteredConsumer(
        IOptions<ServiceBusSettings> settings,
        ILogger<ServiceBusUserRegisteredConsumer> logger,
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
            || typeValue?.ToString() != nameof(UserRegisteredEvent))
        {
            return;
        }

        var userRegistered = args.Message.Body.ToObjectFromJson<UserRegisteredEvent>();
        if (userRegistered is null)
        {
            return;
        }

        _logger.LogInformation(
            "UserRegisteredEvent received: UserId={UserId}, Email={Email}, FullName={FullName}",
            userRegistered.UserId, userRegistered.Email, userRegistered.FullName);

        using var scope = _scopeFactory.CreateScope();
        var persistenceService = scope.ServiceProvider.GetRequiredService<INotificationPersistenceService>();

        await persistenceService.CreateNotificationsAsync(
            batchId: Guid.NewGuid(),
            recipients: [new NotificationRecipient(userRegistered.UserId, userRegistered.Email, userRegistered.FullName)],
            type: NotificationType.Account,
            title: "Welcome to ExamVault!",
            message: $"Hello {userRegistered.FullName}, welcome to ExamVault! Your account has been created successfully.",
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
