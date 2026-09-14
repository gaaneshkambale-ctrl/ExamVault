using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface IAcademicListItemRepository
{
    Task<AcademicListItem?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<AcademicListItem>> GetAsync(string listType, Guid? parentId, CancellationToken cancellationToken = default);

    // Root plus every descendant beneath it, walked level by level (the
    // hierarchy is only 4 deep, so no recursive query is needed) - used to
    // cascade-delete a Program/Department/Semester's children when it's
    // removed, since the FK is Restrict (SQL Server won't allow DB-level
    // cascade on a self-referencing table).
    Task<List<AcademicListItem>> GetDescendantsInclusiveAsync(AcademicListItem root, CancellationToken cancellationToken = default);

    Task AddAsync(AcademicListItem item, CancellationToken cancellationToken = default);
    Task RemoveRangeAsync(IEnumerable<AcademicListItem> items, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
