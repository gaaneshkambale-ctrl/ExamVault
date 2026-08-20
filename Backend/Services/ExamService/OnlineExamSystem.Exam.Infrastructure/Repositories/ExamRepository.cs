using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Exam.Application.Assignments;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Application.Sections;
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

    public Task AddSectionAsync(Section section, CancellationToken cancellationToken = default) =>
        _dbContext.Sections.AddAsync(section, cancellationToken).AsTask();

    public Task<Section?> GetSectionByIdAsync(Guid sectionId, CancellationToken cancellationToken = default) =>
        _dbContext.Sections.FirstOrDefaultAsync(s => s.Id == sectionId, cancellationToken);

    public async Task<IReadOnlyList<Section>> GetSectionsByExamIdAsync(
        Guid examId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.Sections
            .Where(s => s.ExamId == examId)
            .OrderBy(s => s.DisplayOrder)
            .ToListAsync(cancellationToken);

    public async Task<bool> RemoveSectionAsync(Guid sectionId, CancellationToken cancellationToken = default)
    {
        var section = await _dbContext.Sections.FirstOrDefaultAsync(s => s.Id == sectionId, cancellationToken);
        if (section is null)
        {
            return false;
        }

        _dbContext.Sections.Remove(section);
        return true;
    }

    public async Task ReorderSectionsAsync(
        Guid examId,
        IReadOnlyList<SectionOrderEntry> order,
        CancellationToken cancellationToken = default)
    {
        var orderBySectionId = order.ToDictionary(o => o.SectionId, o => o.DisplayOrder);
        var sections = await _dbContext.Sections
            .Where(s => s.ExamId == examId && orderBySectionId.Keys.Contains(s.Id))
            .ToListAsync(cancellationToken);

        foreach (var section in sections)
        {
            section.DisplayOrder = orderBySectionId[section.Id];
        }
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

    public async Task ReplaceAssignmentTargetsAsync(
        Guid assignmentId,
        IReadOnlyList<Guid> targetUserIds,
        CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.ExamAssignmentTargets
            .Where(t => t.ExamAssignmentId == assignmentId)
            .ToListAsync(cancellationToken);
        _dbContext.ExamAssignmentTargets.RemoveRange(existing);

        var targets = targetUserIds
            .Distinct()
            .Select(userId => new ExamAssignmentTarget { ExamAssignmentId = assignmentId, UserId = userId })
            .ToList();
        await _dbContext.ExamAssignmentTargets.AddRangeAsync(targets, cancellationToken);
    }

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

    public async Task<IReadOnlyList<UpcomingAssignmentForReminder>> GetAssignmentsStartingWithinAsync(
        DateTime fromUtc,
        DateTime toUtc,
        CancellationToken cancellationToken = default)
    {
        var publishedExamIds = _dbContext.Exams
            .Where(e => e.Status == ExamStatus.Published)
            .Select(e => e.Id);

        var candidates = await _dbContext.ExamAssignments
            .Where(a => a.StartAtUtc > fromUtc && a.StartAtUtc <= toUtc && publishedExamIds.Contains(a.ExamId))
            .ToListAsync(cancellationToken);
        if (candidates.Count == 0)
        {
            return [];
        }

        var examTitles = await _dbContext.Exams
            .Where(e => candidates.Select(a => a.ExamId).Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, e => e.Title, cancellationToken);
        var assignmentIds = candidates.Select(a => a.Id).ToList();
        var targetsByAssignment = await _dbContext.ExamAssignmentTargets
            .Where(t => assignmentIds.Contains(t.ExamAssignmentId))
            .GroupBy(t => t.ExamAssignmentId)
            .Select(g => new { AssignmentId = g.Key, UserIds = g.Select(t => t.UserId).ToList() })
            .ToDictionaryAsync(g => g.AssignmentId, g => g.UserIds, cancellationToken);

        return candidates
            .Select(a => new UpcomingAssignmentForReminder(
                a.Id,
                a.ExamId,
                examTitles.GetValueOrDefault(a.ExamId, "Unknown Exam"),
                a.StartAtUtc,
                targetsByAssignment.GetValueOrDefault(a.Id, [])))
            .ToList();
    }

    public async Task<IReadOnlyList<Guid>> FilterUserIdsWithoutReminderLogAsync(
        Guid assignmentId,
        ReminderWindow window,
        IReadOnlyList<Guid> candidateUserIds,
        CancellationToken cancellationToken = default)
    {
        var alreadyLogged = await _dbContext.ExamReminderLogs
            .Where(r => r.AssignmentId == assignmentId && r.Window == window && candidateUserIds.Contains(r.UserId))
            .Select(r => r.UserId)
            .ToListAsync(cancellationToken);

        return candidateUserIds.Except(alreadyLogged).ToList();
    }

    public async Task AddReminderLogEntriesAsync(
        Guid assignmentId,
        ReminderWindow window,
        IReadOnlyList<Guid> userIds,
        CancellationToken cancellationToken = default)
    {
        var entries = userIds
            .Select(userId => new ExamReminderLog { AssignmentId = assignmentId, UserId = userId, Window = window })
            .ToList();
        await _dbContext.ExamReminderLogs.AddRangeAsync(entries, cancellationToken);
    }

    public async Task<ReminderSettings> GetOrCreateReminderSettingsAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.ReminderSettings.FirstOrDefaultAsync(cancellationToken);
        if (settings is null)
        {
            settings = new ReminderSettings();
            await _dbContext.ReminderSettings.AddAsync(settings, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return settings;
    }

    public async Task<ProctoringSettings> GetOrCreateProctoringSettingsAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.ProctoringSettings.FirstOrDefaultAsync(cancellationToken);
        if (settings is null)
        {
            settings = new ProctoringSettings();
            await _dbContext.ProctoringSettings.AddAsync(settings, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return settings;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
