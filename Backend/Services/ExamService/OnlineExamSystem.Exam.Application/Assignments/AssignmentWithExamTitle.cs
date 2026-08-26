using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Assignments;

public record AssignmentWithExamTitle(ExamAssignment Assignment, string ExamTitle, int TargetCount);
