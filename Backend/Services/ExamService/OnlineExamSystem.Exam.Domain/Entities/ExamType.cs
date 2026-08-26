using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Exam.Domain.Entities;

// Dynamic, admin-manageable exam-purpose classification (Practice/Mock/
// Certification/etc.) - distinct from CreationMethod (how the exam was
// authored: Manual vs AiGenerated) and from Category (free-text subject tag).
public class ExamType : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Purpose { get; set; }
}
