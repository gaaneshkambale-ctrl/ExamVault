using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.User.Domain.Entities;

public class Group : TenantScopedEntity
{
    public string Name { get; set; } = string.Empty;
}
