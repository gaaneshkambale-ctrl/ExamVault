using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.User.Domain.Entities;

public class Group : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
}
