using OnlineExamSystem.Exam.Application.Exams;

namespace OnlineExamSystem.Exam.Application.Exams.List;

public record ListExamsQuery(Guid CallerId, ExamAccessScope Scope);
