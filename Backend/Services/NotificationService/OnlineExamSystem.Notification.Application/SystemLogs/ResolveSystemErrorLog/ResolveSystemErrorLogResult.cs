namespace OnlineExamSystem.Notification.Application.SystemLogs.ResolveSystemErrorLog;

public record ResolveSystemErrorLogResult(bool Found)
{
    public static ResolveSystemErrorLogResult NotFound() => new(false);
    public static ResolveSystemErrorLogResult Ok() => new(true);
}
