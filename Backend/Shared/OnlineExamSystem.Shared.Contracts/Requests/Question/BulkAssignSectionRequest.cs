namespace OnlineExamSystem.Shared.Contracts.Requests.Question;

public record BulkAssignSectionRequest(Guid? SectionId, IReadOnlyList<Guid> QuestionIds);
