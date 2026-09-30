using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Question.Domain.Entities;

// Question Bank taxonomy, owned by the organization (tenant), not the
// platform. Deliberately NOT tied to Program/Semester/Division - those are
// exam/eligibility context, so one question stays reusable across them.
public class BankSubject : TenantScopedEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CreatedByUserId { get; set; }
}
