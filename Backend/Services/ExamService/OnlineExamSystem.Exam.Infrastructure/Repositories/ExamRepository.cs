using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Exam.Application.Assignments;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Exam.Infrastructure.Persistence;

namespace OnlineExamSystem.Exam.Infrastructure.Repositories;

public class ExamRepository : IExamRepository
{
    private readonly ExamDbContext _dbContext;

    public ExamRepository(ExamDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(ExamPaper exam, CancellationToken cancellationToken = default) =>
        _dbContext.Exams.AddAsync(exam, cancellationToken).AsTask();

    public Task<ExamPaper?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Exams.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ExamPaper>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.Exams
            .OrderByDescending(e => e.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public Task RemoveAsync(ExamPaper exam, CancellationToken cancellationToken = default)
    {
        _dbContext.Exams.Remove(exam);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<ExamPaper>> GetAssignedPublishedExamsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var assignedExamIds = _dbContext.ExamAssignmentTargets
            .Where(t => t.UserId == userId)
            .Join(_dbContext.ExamAssignments, t => t.ExamAssignmentId, a => a.Id, (t, a) => a.ExamId)
            .Distinct();

        return await _dbContext.Exams
            .Where(e => e.Status == ExamStatus.Published && assignedExamIds.Contains(e.Id))
            .OrderByDescending(e => e.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task<bool> IsUserAssignedAsync(
        Guid examId,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        _dbContext.ExamAssignmentTargets
            .Where(t => t.UserId == userId)
            .Join(
                _dbContext.ExamAssignments.Where(a => a.ExamId == examId),
                t => t.ExamAssignmentId,
                a => a.Id,
                (t, a) => t.Id)
            .AnyAsync(cancellationToken);

    public Task<ExamAssignment?> GetAssignmentForUserAndExamAsync(
        Guid examId,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        _dbContext.ExamAssignmentTargets
            .Where(t => t.UserId == userId)
            .Join(
                _dbContext.ExamAssignments.Where(a => a.ExamId == examId),
                t => t.ExamAssignmentId,
                a => a.Id,
                (t, a) => a)
            .OrderByDescending(a => a.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task AddAssignmentAsync(
        ExamAssignment assignment,
        IReadOnlyList<Guid> targetUserIds,
        CancellationToken cancellationToken = default)
    {
        await _dbContext.ExamAssignments.AddAsync(assignment, cancellationToken);

        var targets = targetUserIds
            .Distinct()
            .Select(userId => new ExamAssignmentTarget { ExamAssignmentId = assignment.Id, UserId = userId })
            .ToList();
        await _dbContext.ExamAssignmentTargets.AddRangeAsync(targets, cancellationToken);
    }

    public Task<ExamAssignment?> GetAssignmentByIdAsync(
        Guid assignmentId,
        CancellationToken cancellationToken = default) =>
        _dbContext.ExamAssignments.FirstOrDefaultAsync(a => a.Id == assignmentId, cancellationToken);

    public async Task<IReadOnlyList<Guid>> GetAssignmentTargetUserIdsAsync(
        Guid assignmentId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.ExamAssignmentTargets
            .Where(t => t.ExamAssignmentId == assignmentId)
            .Select(t => t.UserId)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ExamAssignment>> GetAssignmentsForExamAsync(
        Guid examId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.ExamAssignments
            .Where(a => a.ExamId == examId)
            .OrderByDescending(a => a.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<AssignmentWithExamTitle>> GetAllAssignmentsAsync(
        CancellationToken cancellationToken = default)
    {
        var assignments = await _dbContext.ExamAssignments
            .OrderByDescending(a => a.CreatedAtUtc)
            .ToListAsync(cancellationToken);
        var examTitles = await _dbContext.Exams.ToDictionaryAsync(e => e.Id, e => e.Title, cancellationToken);
        var targetCounts = await _dbContext.ExamAssignmentTargets
            .GroupBy(t => t.ExamAssignmentId)
            .Select(g => new { AssignmentId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.AssignmentId, g => g.Count, cancellationToken);

        return assignments
            .Select(a => new AssignmentWithExamTitle(
                a,
                examTitles.GetValueOrDefault(a.ExamId, "Unknown Exam"),
                targetCounts.GetValueOrDefault(a.Id)))
            .ToList();
    }

    public async Task<bool> RemoveAssignmentAsync(
        Guid assignmentId,
        CancellationToken cancellationToken = default)
    {
        var assignment = await _dbContext.ExamAssignments.FirstOrDefaultAsync(
            a => a.Id == assignmentId,
            cancellationToken);
        if (assignment is null)
        {
            return false;
        }

        _dbContext.ExamAssignments.Remove(assignment);
        return true;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
