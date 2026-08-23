using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Question.Domain.Entities;

public class QuestionOption : TenantScopedEntity
{
    public Guid QuestionId { get; set; }
    public string OptionText { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int DisplayOrder { get; set; }
}
