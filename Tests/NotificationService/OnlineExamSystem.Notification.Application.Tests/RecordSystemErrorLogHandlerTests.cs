using OnlineExamSystem.Notification.Application.SystemLogs.RecordSystemErrorLog;
using OnlineExamSystem.Notification.Application.Tests.Fakes;
using OnlineExamSystem.Notification.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Notification.Application.Tests;

public class RecordSystemErrorLogHandlerTests
{
    [Fact]
    public async Task Stores_the_client_ip_address_of_the_failing_request()
    {
        var repository = new FakeSystemErrorLogRepository();
        var handler = new RecordSystemErrorLogHandler(repository);

        await handler.HandleAsync(new RecordSystemErrorLogCommand(
            "User Service", SystemLogLevel.Error, "Boom", "InvalidOperationException", null,
            "/api/users/login", "POST", null, IpAddress: "203.0.113.7"));

        var entry = Assert.Single(repository.Entries);
        Assert.Equal("203.0.113.7", entry.IpAddress);
    }

    [Fact]
    public async Task Background_job_errors_have_no_ip_address()
    {
        var repository = new FakeSystemErrorLogRepository();
        var handler = new RecordSystemErrorLogHandler(repository);

        await handler.HandleAsync(new RecordSystemErrorLogCommand(
            "Exam Service", SystemLogLevel.Error, "Reminder job failed", null, null, null, null, null));

        Assert.Null(Assert.Single(repository.Entries).IpAddress);
    }
}
