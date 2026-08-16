namespace OnlineExamSystem.NotificationService.Worker;

public class ServiceBusSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string TopicName { get; set; } = "examvault.events";
}
