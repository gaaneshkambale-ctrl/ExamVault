namespace OnlineExamSystem.Exam.Application.Sections.Reorder;

public record ReorderSectionsCommand(Guid ExamId, IReadOnlyList<SectionOrderEntry> Order);
