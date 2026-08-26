namespace OnlineExamSystem.Question.Application.Questions.BulkAssignSection;

public record BulkAssignSectionCommand(Guid? SectionId, IReadOnlyList<Guid> QuestionIds);
