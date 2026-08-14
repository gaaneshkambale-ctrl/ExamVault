using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.ListByExam;

public record AttemptWithAnswers(ExamAttempt Attempt, IReadOnlyList<AttemptAnswer> Answers);
