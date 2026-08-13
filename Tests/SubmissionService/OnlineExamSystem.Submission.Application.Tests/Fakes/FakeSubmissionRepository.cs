using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Tests.Fakes;

public class FakeSubmissionRepository : ISubmissionRepository
{
    private readonly List<ExamAttempt> _attempts = [];
    private readonly List<AttemptAnswer> _answers = [];

    public IReadOnlyList<ExamAttempt> Attempts => _attempts;
    public IReadOnlyList<AttemptAnswer> Answers => _answers;

    public void SeedAttempt(ExamAttempt attempt) => _attempts.Add(attempt);

    public void SeedAnswer(AttemptAnswer answer) => _answers.Add(answer);

    public Task<ExamAttempt?> GetInProgressAttemptAsync(
        Guid examId,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_attempts.FirstOrDefault(
            a => a.ExamId == examId && a.UserId == userId && a.Status == AttemptStatus.InProgress));

    public Task<int> CountAttemptsAsync(Guid examId, Guid userId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_attempts.Count(a => a.ExamId == examId && a.UserId == userId));

    public Task AddAttemptAsync(ExamAttempt attempt, CancellationToken cancellationToken = default)
    {
        _attempts.Add(attempt);
        return Task.CompletedTask;
    }

    public Task<ExamAttempt?> GetAttemptByIdAsync(Guid attemptId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_attempts.FirstOrDefault(a => a.Id == attemptId));

    public Task<AttemptAnswer?> GetAnswerAsync(
        Guid attemptId,
        Guid questionId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_answers.FirstOrDefault(a => a.AttemptId == attemptId && a.QuestionId == questionId));

    public Task AddAnswerAsync(AttemptAnswer answer, CancellationToken cancellationToken = default)
    {
        _answers.Add(answer);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
