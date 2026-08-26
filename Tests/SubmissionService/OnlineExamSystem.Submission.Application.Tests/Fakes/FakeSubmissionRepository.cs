using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Tests.Fakes;

public class FakeSubmissionRepository : ISubmissionRepository
{
    private readonly List<ExamAttempt> _attempts = [];
    private readonly List<AttemptAnswer> _answers = [];
    private readonly List<AttemptSectionState> _sectionStates = [];
    private readonly List<ViolationEvent> _violationEvents = [];

    public IReadOnlyList<ExamAttempt> Attempts => _attempts;
    public IReadOnlyList<AttemptAnswer> Answers => _answers;
    public IReadOnlyList<AttemptSectionState> SectionStates => _sectionStates;
    public IReadOnlyList<ViolationEvent> ViolationEvents => _violationEvents;

    public void SeedAttempt(ExamAttempt attempt) => _attempts.Add(attempt);

    public void SeedAnswer(AttemptAnswer answer) => _answers.Add(answer);

    public void SeedSectionState(AttemptSectionState state) => _sectionStates.Add(state);

    public void SeedViolationEvent(ViolationEvent violationEvent) => _violationEvents.Add(violationEvent);

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

    public Task<ExamAttempt?> GetMostRecentAttemptAsync(
        Guid examId,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_attempts
            .Where(a => a.ExamId == examId && a.UserId == userId)
            .OrderByDescending(a => a.AttemptNumber)
            .FirstOrDefault());

    public Task<AttemptAnswer?> GetAnswerAsync(
        Guid attemptId,
        Guid questionId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_answers.FirstOrDefault(a => a.AttemptId == attemptId && a.QuestionId == questionId));

    public Task<IReadOnlyList<AttemptAnswer>> GetAnswersByAttemptIdAsync(
        Guid attemptId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<AttemptAnswer>>(
            _answers.Where(a => a.AttemptId == attemptId).ToList());

    public Task<IReadOnlyList<ExamAttempt>> GetSubmittedAttemptsByExamIdAsync(
        Guid examId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ExamAttempt>>(
            _attempts
                .Where(a => a.ExamId == examId
                    && (a.Status == AttemptStatus.Submitted || a.Status == AttemptStatus.AutoSubmitted))
                .ToList());

    public Task<IReadOnlyList<ExamAttempt>> GetAllAttemptsByExamIdAsync(
        Guid examId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ExamAttempt>>(
            _attempts.Where(a => a.ExamId == examId).ToList());

    public Task<IReadOnlyList<ExamAttempt>> GetAttemptsByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ExamAttempt>>(
            _attempts
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.StartedAtUtc)
                .ToList());

    public Task<ILookup<Guid, AttemptAnswer>> GetAnswersByAttemptIdsAsync(
        IReadOnlyList<Guid> attemptIds,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_answers.Where(a => attemptIds.Contains(a.AttemptId)).ToLookup(a => a.AttemptId));

    public Task AddAnswerAsync(AttemptAnswer answer, CancellationToken cancellationToken = default)
    {
        _answers.Add(answer);
        return Task.CompletedTask;
    }

    public Task<AttemptSectionState?> GetSectionStateAsync(
        Guid attemptId,
        Guid sectionId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_sectionStates.FirstOrDefault(
            s => s.AttemptId == attemptId && s.SectionId == sectionId));

    public Task<IReadOnlyList<AttemptSectionState>> GetSectionStatesByAttemptIdAsync(
        Guid attemptId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<AttemptSectionState>>(
            _sectionStates.Where(s => s.AttemptId == attemptId).ToList());

    public Task AddSectionStateAsync(AttemptSectionState state, CancellationToken cancellationToken = default)
    {
        _sectionStates.Add(state);
        return Task.CompletedTask;
    }

    public Task AddViolationEventAsync(ViolationEvent violationEvent, CancellationToken cancellationToken = default)
    {
        _violationEvents.Add(violationEvent);
        return Task.CompletedTask;
    }

    public Task<ViolationEvent?> GetViolationEventByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(_violationEvents.FirstOrDefault(v => v.Id == id));

    public Task<IReadOnlyList<ViolationEvent>> GetViolationEventsByAttemptIdsAsync(
        IReadOnlyList<Guid> attemptIds,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ViolationEvent>>(
            _violationEvents.Where(v => attemptIds.Contains(v.AttemptId)).ToList());

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
