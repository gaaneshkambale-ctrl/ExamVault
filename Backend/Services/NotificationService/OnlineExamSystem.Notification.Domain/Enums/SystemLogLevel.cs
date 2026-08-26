namespace OnlineExamSystem.Notification.Domain.Enums;

// Named SystemLogLevel (not LogLevel) to avoid colliding with
// Microsoft.Extensions.Logging.LogLevel, which several files in this
// service already reference for the ILogger<T> calls.
public enum SystemLogLevel
{
    Trace = 0,
    Debug = 1,
    Information = 2,
    Warning = 3,
    Error = 4,
    Critical = 5,
}
