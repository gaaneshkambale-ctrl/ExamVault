using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using OnlineExamSystem.Submission.Infrastructure.Persistence;

namespace OnlineExamSystem.Submission.Infrastructure.Repositories;

public class SubmissionRepository : ISubmissionRepository
{
    private readonly SubmissionDbContext _dbContext;

    public SubmissionRepository(SubmissionDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<ExamAttempt?> GetInProgressAttemptAsync(
        Guid examId,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        _dbContext.ExamAttempts.FirstOrDefaultAsync(
            a => a.ExamId == examId && a.UserId == userId && a.Status == AttemptStatus.InProgress,
            cancellationToken);

    public Task<int> CountAttemptsAsync(Guid examId, Guid userId, CancellationToken cancellationToken = default) =>
        _dbContext.ExamAttempts.CountAsync(a => a.ExamId == examId && a.UserId == userId, cancellationToken);

    public async Task AddAttemptAsync(ExamAttempt attempt, CancellationToken cancellationToken = default) =>
        await _dbContext.ExamAttempts.AddAsync(attempt, cancellationToken);

    public Task<ExamAttempt?> GetAttemptByIdAsync(Guid attemptId, CancellationToken cancellationToken = default) =>
        _dbContext.ExamAttempts.FirstOrDefaultAsync(a => a.Id == attemptId, cancellationToken);

    public Task<ExamAttempt?> GetMostRecentAttemptAsync(
        Guid examId,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        _dbContext.ExamAttempts
            .Where(a => a.ExamId == examId && a.UserId == userId)
            .OrderByDescending(a => a.AttemptNumber)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<AttemptAnswer?> GetAnswerAsync(
        Guid attemptId,
        Guid questionId,
        CancellationToken cancellationToken = default) =>
        _dbContext.AttemptAnswers.FirstOrDefaultAsync(
            a => a.AttemptId == attemptId && a.QuestionId == questionId,
            cancellationToken);

    public async Task<IReadOnlyList<ExamAttempt>> GetAttemptsByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.ExamAttempts
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.StartedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ExamAttempt>> GetAllAttemptsAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.ExamAttempts
            .OrderByDescending(a => a.StartedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<AttemptAnswer>> GetAnswersByAttemptIdAsync(
        Guid attemptId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.AttemptAnswers
            .Where(a => a.AttemptId == attemptId)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ExamAttempt>> GetSubmittedAttemptsByExamIdAsync(
        Guid examId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.ExamAttempts
            .Where(a => a.ExamId == examId
                && (a.Status == AttemptStatus.Submitted || a.Status == AttemptStatus.AutoSubmitted))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ExamAttempt>> GetAllAttemptsByExamIdAsync(
        Guid examId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.ExamAttempts
            .Where(a => a.ExamId == examId)
            .ToListAsync(cancellationToken);

    public async Task<ILookup<Guid, AttemptAnswer>> GetAnswersByAttemptIdsAsync(
        IReadOnlyList<Guid> attemptIds,
        CancellationToken cancellationToken = default)
    {
        var answers = await _dbContext.AttemptAnswers
            .Where(a => attemptIds.Contains(a.AttemptId))
            .ToListAsync(cancellationToken);
        return answers.ToLookup(a => a.AttemptId);
    }

    public async Task<AttemptAnswer> UpsertAnswerAsync(
        Guid attemptId,
        Guid questionId,
        Guid? selectedOptionId,
        string? selectedOptionIdsJson,
        bool isMarkedForReview,
        string? answerText,
        DateTime answeredAtUtc,
        CancellationToken cancellationToken = default)
    {
        var existing = await GetAnswerAsync(attemptId, questionId, cancellationToken);
        if (existing is not null)
        {
            existing.SelectedOptionId = selectedOptionId;
            existing.SelectedOptionIdsJson = selectedOptionIdsJson;
            existing.IsMarkedForReview = isMarkedForReview;
            existing.AnsweredAtUtc = answeredAtUtc;
            existing.AnswerText = answerText;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return existing;
        }

        var answer = new AttemptAnswer
        {
            AttemptId = attemptId,
            QuestionId = questionId,
            SelectedOptionId = selectedOptionId,
            SelectedOptionIdsJson = selectedOptionIdsJson,
            IsMarkedForReview = isMarkedForReview,
            AnsweredAtUtc = answeredAtUtc,
            AnswerText = answerText,
        };
        await _dbContext.AttemptAnswers.AddAsync(answer, cancellationToken);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            return answer;
        }
        catch (DbUpdateException)
        {
            // Another concurrent save for the same question (autosave racing
            // "Save & Next") won the race on the unique (AttemptId,
            // QuestionId) index and inserted first - this insert can never
            // succeed now. Detach it (still tracked as Added) and fall back
            // to updating the row that won, so this save isn't lost.
            _dbContext.Entry(answer).State = EntityState.Detached;
            var concurrent = await GetAnswerAsync(attemptId, questionId, cancellationToken)
                ?? throw new InvalidOperationException(
                    $"Answer insert for attempt {attemptId}, question {questionId} failed but no conflicting row was found.");
            concurrent.SelectedOptionId = selectedOptionId;
            concurrent.SelectedOptionIdsJson = selectedOptionIdsJson;
            concurrent.IsMarkedForReview = isMarkedForReview;
            concurrent.AnsweredAtUtc = answeredAtUtc;
            concurrent.AnswerText = answerText;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return concurrent;
        }
    }

    public Task<AttemptSectionState?> GetSectionStateAsync(
        Guid attemptId,
        Guid sectionId,
        CancellationToken cancellationToken = default) =>
        _dbContext.AttemptSectionStates.FirstOrDefaultAsync(
            s => s.AttemptId == attemptId && s.SectionId == sectionId,
            cancellationToken);

    public async Task<IReadOnlyList<AttemptSectionState>> GetSectionStatesByAttemptIdAsync(
        Guid attemptId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.AttemptSectionStates
            .Where(s => s.AttemptId == attemptId)
            .ToListAsync(cancellationToken);

    public async Task AddSectionStateAsync(AttemptSectionState state, CancellationToken cancellationToken = default) =>
        await _dbContext.AttemptSectionStates.AddAsync(state, cancellationToken);

    public async Task AddViolationEventAsync(
        ViolationEvent violationEvent,
        CancellationToken cancellationToken = default) =>
        await _dbContext.ViolationEvents.AddAsync(violationEvent, cancellationToken);

    public Task<ViolationEvent?> GetViolationEventByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.ViolationEvents.FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ViolationEvent>> GetViolationEventsByAttemptIdsAsync(
        IReadOnlyList<Guid> attemptIds,
        CancellationToken cancellationToken = default) =>
        await _dbContext.ViolationEvents
            .Where(v => attemptIds.Contains(v.AttemptId))
            .ToListAsync(cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
