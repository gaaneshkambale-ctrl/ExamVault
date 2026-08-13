using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Assignments;

public record AssignmentWithTargets(ExamAssignment Assignment, IReadOnlyList<Guid> TargetUserIds);
