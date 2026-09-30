using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Question.Domain.Entities;

public class BankTopic : TenantScopedEntity
{
    public Guid SubjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid CreatedByUserId { get; set; }
}
