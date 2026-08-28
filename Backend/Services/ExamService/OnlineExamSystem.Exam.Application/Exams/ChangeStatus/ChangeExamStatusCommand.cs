using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Exams.ChangeStatus;

public record ChangeExamStatusCommand(Guid ExamId, ExamStatus TargetStatus, string BearerToken = "");
