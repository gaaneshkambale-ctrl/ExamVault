namespace OnlineExamSystem.Notification.Application.Interfaces;

// Calls User Service's internal-only permission-version endpoint (never
// routed through the Gateway). Returns null on ANY failure (unreachable,
// timeout, unknown tenant) - callers must treat null as "can't tell,
// fail open," never as "version is 0."
public interface IPermissionVersionClient
{
    Task<int?> GetCurrentVersionAsync(Guid tenantId, CancellationToken cancellationToken = default);
}
