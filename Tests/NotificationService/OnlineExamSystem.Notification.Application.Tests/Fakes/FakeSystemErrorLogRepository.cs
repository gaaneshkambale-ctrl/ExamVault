using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Tests.Fakes;

public class FakeSystemErrorLogRepository : ISystemErrorLogRepository
{
    public List<SystemErrorLog> Entries { get; } = new();

    public Task AddAsync(SystemErrorLog entry, CancellationToken cancellationToken = default)
    {
        Entries.Add(entry);
        return Task.CompletedTask;
    }

    public Task<SystemErrorLog?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(Entries.FirstOrDefault(e => e.Id == id));

    public Task<IReadOnlyList<SystemErrorLog>> GetAsync(
        DateTime fromUtc,
        DateTime toUtc,
        string? service,
        SystemLogLevel? severity,
        bool? isResolved,
        int take,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<SystemErrorLog>>(Entries.Take(take).ToList());

    public Task<int> DeleteOlderThanAsync(DateTime cutoffUtc, CancellationToken cancellationToken = default) =>
        Task.FromResult(0);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
