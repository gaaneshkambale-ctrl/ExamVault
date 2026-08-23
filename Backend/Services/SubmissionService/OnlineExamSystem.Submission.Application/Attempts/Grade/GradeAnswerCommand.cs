namespace OnlineExamSystem.Submission.Application.Attempts.Grade;

public record GradeAnswerCommand(
    Guid AttemptId,
    Guid QuestionId,
    int MarksAwarded,
    Guid GradedByUserId);
