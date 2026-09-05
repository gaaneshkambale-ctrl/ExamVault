using OnlineExamSystem.Exam.Application.Exams;

namespace OnlineExamSystem.Exam.Application.Exams.GetById;

public record GetExamQuery(Guid Id, Guid CallerId, ExamAccessScope Scope);
