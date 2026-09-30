using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Persistence;

namespace OnlineExamSystem.User.Infrastructure.Repositories;

public class OrganizationAcademicConfigRepository : IOrganizationAcademicConfigRepository
{
    private readonly UserDbContext _dbContext;

    public OrganizationAcademicConfigRepository(UserDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<OrganizationAcademicConfig?> GetByTenantIdAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
        _dbContext.OrganizationAcademicConfigs.FirstOrDefaultAsync(c => c.TenantId == tenantId, cancellationToken);

    public Task AddAsync(OrganizationAcademicConfig config, CancellationToken cancellationToken = default) =>
        _dbContext.OrganizationAcademicConfigs.AddAsync(config, cancellationToken).AsTask();

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
