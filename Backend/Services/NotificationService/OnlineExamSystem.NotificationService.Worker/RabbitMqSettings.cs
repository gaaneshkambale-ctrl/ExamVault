namespace OnlineExamSystem.NotificationService.Worker;

public class RabbitMqSettings
{
    public string HostName { get; set; } = "localhost";
    public int Port { get; set; } = 5672;
    public string UserName { get; set; } = "guest";
    public string Password { get; set; } = "guest";
    public string ExchangeName { get; set; } = "examvault.events";
    public string QueueName { get; set; } = "notification-service.events";
}
