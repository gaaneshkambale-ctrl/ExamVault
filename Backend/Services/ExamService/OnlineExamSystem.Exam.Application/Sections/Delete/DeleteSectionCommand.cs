namespace OnlineExamSystem.Exam.Application.Sections.Delete;

public record DeleteSectionCommand(Guid SectionId, string BearerToken);
