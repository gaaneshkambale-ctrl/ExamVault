using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Question.Domain.Entities;

public class BankQuestionTag : TenantScopedEntity
{
    public Guid QuestionId { get; set; }
    public Guid TagId { get; set; }
}
