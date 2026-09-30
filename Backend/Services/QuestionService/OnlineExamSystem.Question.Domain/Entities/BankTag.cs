using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Question.Domain.Entities;

public class BankTag : TenantScopedEntity
{
    public string Name { get; set; } = string.Empty;
    public Guid CreatedByUserId { get; set; }
}
