using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakeAuditClient : IAuditClient
{
    public record Entry(Guid TenantId, string Module, string Activity, Guid? UserId, string? UserName);

    private readonly List<Entry> _entries = [];

    public IReadOnlyList<Entry> Entries => _entries;

    public Task RecordAsync(
        Guid tenantId,
        string module,
        string activity,
        string? details,
        string? entityId,
        Guid? userId,
        string? userName,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        _entries.Add(new Entry(tenantId, module, activity, userId, userName));
        return Task.CompletedTask;
    }
}
