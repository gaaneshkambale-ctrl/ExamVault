namespace OnlineExamSystem.Exam.Application.Exams.GetById;

public record GetExamQuery(Guid Id, Guid CallerId, bool IsAdmin);
