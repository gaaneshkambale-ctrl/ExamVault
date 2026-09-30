using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface IPlatformSettingsRepository
{
    /// <summary>Returns null if no row has been created yet - callers on hot paths
    /// (login, register, token issuance) must fall back to a safe default rather
    /// than creating a row as a side effect of an unrelated request.</summary>
    Task<PlatformSettings?> GetAsync(CancellationToken cancellationToken = default);

    /// <summary>Creates the single row on first use - only called from the
    /// Settings pages' own GET/PUT endpoints, never from a hot path.</summary>
    Task<PlatformSettings> GetOrCreateAsync(CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
