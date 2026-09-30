using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface ITenantRepository
{
    Task<Tenant?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Tenant?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<Tenant?> GetByNameAsync(string name, CancellationToken cancellationToken = default);
    Task<Tenant?> GetByOrganizationCodeAsync(string organizationCode, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Tenant>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(Tenant tenant, CancellationToken cancellationToken = default);
    Task RemoveAsync(Tenant tenant, CancellationToken cancellationToken = default);

    /// <summary>Bulk-deletes every row across this tenant's other UserDb tables that
    /// has a DeleteBehavior.Restrict foreign key back to Tenant - AppUser, Group,
    /// RolePermission, and AcademicListItem (self-referencing Restrict too, but a
    /// single bulk delete removes the whole tree in one statement, so no dangling
    /// parent reference survives it) - so this must run (and its changes be saved)
    /// before the Tenant row itself can be removed. RefreshTokens/UserPreferences/
    /// GroupMembers cascade automatically once their owning User/Group is deleted -
    /// no need to touch those directly. OrganizationAcademicConfig has no FK to
    /// Tenant at all, so it's left orphaned rather than purged - same accepted
    /// scope as the cross-service Exam/Question/Submission/Notification rows this
    /// tenant leaves behind (see DeleteTenantHandler.cs's own doc comment).</summary>
    Task DeleteTenantScopedDataAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
