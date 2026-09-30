using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Persistence;

namespace OnlineExamSystem.User.Infrastructure.Repositories;

public class AcademicListItemRepository : IAcademicListItemRepository
{
    private readonly UserDbContext _dbContext;

    public AcademicListItemRepository(UserDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<AcademicListItem?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.AcademicListItems.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<List<AcademicListItem>> GetAsync(string listType, Guid? parentId, CancellationToken cancellationToken = default) =>
        _dbContext.AcademicListItems
            .Where(x => x.ListType == listType && x.ParentId == parentId)
            .OrderBy(x => x.Value)
            .ToListAsync(cancellationToken);

    public async Task<List<AcademicListItem>> GetDescendantsInclusiveAsync(
        AcademicListItem root,
        CancellationToken cancellationToken = default)
    {
        var result = new List<AcademicListItem> { root };
        var frontierIds = new List<Guid> { root.Id };

        while (frontierIds.Count > 0)
        {
            var children = await _dbContext.AcademicListItems
                .Where(x => x.ParentId != null && frontierIds.Contains(x.ParentId!.Value))
                .ToListAsync(cancellationToken);

            if (children.Count == 0)
            {
                break;
            }

            result.AddRange(children);
            frontierIds = children.Select(c => c.Id).ToList();
        }

        return result;
    }

    public async Task AddAsync(AcademicListItem item, CancellationToken cancellationToken = default) =>
        await _dbContext.AcademicListItems.AddAsync(item, cancellationToken);

    public Task RemoveRangeAsync(IEnumerable<AcademicListItem> items, CancellationToken cancellationToken = default)
    {
        _dbContext.AcademicListItems.RemoveRange(items);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
