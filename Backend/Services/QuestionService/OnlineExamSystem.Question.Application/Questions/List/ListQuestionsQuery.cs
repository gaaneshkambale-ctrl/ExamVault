namespace OnlineExamSystem.Question.Application.Questions.List;

public record ListQuestionsQuery(Guid ExamId, Guid? SectionId = null, bool UnassignedOnly = false);
