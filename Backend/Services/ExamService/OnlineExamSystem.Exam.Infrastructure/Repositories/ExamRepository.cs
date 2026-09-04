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
        _dbContext.Exams.Include(e => e.ExamType).FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ExamPaper>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.Exams
            .Include(e => e.ExamType)
            .OrderByDescending(e => e.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public Task<int> CountByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
        _dbContext.Exams.CountAsync(e => e.TenantId == tenantId, cancellationToken);

    public Task RemoveAsync(ExamPaper exam, CancellationToken cancellationToken = default)
    {
        _dbContext.Exams.Remove(exam);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<ExamPaper>> GetOwnedAsync(
        Guid createdByUserId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.Exams
            .Include(e => e.ExamType)
            .Where(e => e.CreatedByUserId == createdByUserId)
            .OrderByDescending(e => e.CreatedAtUtc)
            .ToListAsync(cancellationToken);

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

    public async Task<IReadOnlyList<SectionWithExamTitle>> GetAllSectionsAsync(CancellationToken cancellationToken = default)
    {
        var sections = await _dbContext.Sections
            .OrderBy(s => s.DisplayOrder)
            .ToListAsync(cancellationToken);
        var examTitles = await _dbContext.Exams.ToDictionaryAsync(e => e.Id, e => e.Title, cancellationToken);

        return sections
            .Select(s => new SectionWithExamTitle(s, examTitles.GetValueOrDefault(s.ExamId, "Unknown Exam")))
            .ToList();
    }

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
            .Include(e => e.ExamType)
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

    // IgnoreQueryFilters() throughout this method: the reminder check background job has no
    // authenticated caller/current tenant (it runs on a timer, not behind a request), so the
    // ambient tenant filter would otherwise silently return nothing for every tenant. It must
    // see every tenant's candidates and let the caller (the job) sort them by TenantId itself.
    public async Task<IReadOnlyList<UpcomingAssignmentForReminder>> GetAssignmentsStartingWithinAsync(
        DateTime fromUtc,
        DateTime toUtc,
        CancellationToken cancellationToken = default)
    {
        var publishedExamIds = _dbContext.Exams
            .IgnoreQueryFilters()
            .Where(e => e.Status == ExamStatus.Published)
            .Select(e => e.Id);

        var candidates = await _dbContext.ExamAssignments
            .IgnoreQueryFilters()
            .Where(a => a.StartAtUtc > fromUtc && a.StartAtUtc <= toUtc && publishedExamIds.Contains(a.ExamId))
            .ToListAsync(cancellationToken);
        if (candidates.Count == 0)
        {
            return [];
        }

        var examTitles = await _dbContext.Exams
            .IgnoreQueryFilters()
            .Where(e => candidates.Select(a => a.ExamId).Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, e => e.Title, cancellationToken);
        var assignmentIds = candidates.Select(a => a.Id).ToList();
        var targetsByAssignment = await _dbContext.ExamAssignmentTargets
            .IgnoreQueryFilters()
            .Where(t => assignmentIds.Contains(t.ExamAssignmentId))
            .GroupBy(t => t.ExamAssignmentId)
            .Select(g => new { AssignmentId = g.Key, UserIds = g.Select(t => t.UserId).ToList() })
            .ToDictionaryAsync(g => g.AssignmentId, g => g.UserIds, cancellationToken);

        return candidates
            .Select(a => new UpcomingAssignmentForReminder(
                a.TenantId,
                a.Id,
                a.ExamId,
                examTitles.GetValueOrDefault(a.ExamId, "Unknown Exam"),
                a.StartAtUtc,
                targetsByAssignment.GetValueOrDefault(a.Id, [])))
            .ToList();
    }

    // IgnoreQueryFilters(): same reason as above - called only from the background job. Safe
    // without an explicit TenantId check because assignmentId already uniquely identifies a
    // single row regardless of tenant.
    public async Task<IReadOnlyList<Guid>> FilterUserIdsWithoutReminderLogAsync(
        Guid assignmentId,
        ReminderWindow window,
        IReadOnlyList<Guid> candidateUserIds,
        CancellationToken cancellationToken = default)
    {
        var alreadyLogged = await _dbContext.ExamReminderLogs
            .IgnoreQueryFilters()
            .Where(r => r.AssignmentId == assignmentId && r.Window == window && candidateUserIds.Contains(r.UserId))
            .Select(r => r.UserId)
            .ToListAsync(cancellationToken);

        return candidateUserIds.Except(alreadyLogged).ToList();
    }

    public async Task AddReminderLogEntriesAsync(
        Guid tenantId,
        Guid assignmentId,
        ReminderWindow window,
        IReadOnlyList<Guid> userIds,
        CancellationToken cancellationToken = default)
    {
        var entries = userIds
            .Select(userId => new ExamReminderLog
            {
                TenantId = tenantId,
                AssignmentId = assignmentId,
                UserId = userId,
                Window = window,
            })
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

    public async Task<ReminderSettings> GetOrCreateReminderSettingsForTenantAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.ReminderSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId, cancellationToken);
        if (settings is null)
        {
            settings = new ReminderSettings { TenantId = tenantId };
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

    public async Task<ExamDefaults> GetOrCreateExamDefaultsAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.ExamDefaults.FirstOrDefaultAsync(cancellationToken);
        if (settings is null)
        {
            settings = new ExamDefaults();
            await _dbContext.ExamDefaults.AddAsync(settings, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return settings;
    }

    public Task AddExamTypeAsync(ExamType examType, CancellationToken cancellationToken = default) =>
        _dbContext.ExamTypes.AddAsync(examType, cancellationToken).AsTask();

    public Task<ExamType?> GetExamTypeByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.ExamTypes.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ExamType>> GetAllExamTypesAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.ExamTypes
            .OrderBy(t => t.Name)
            .ToListAsync(cancellationToken);

    /// <summary>Returns true if the exam type was found and removed. Any exams referencing it
    /// have their ExamTypeId set to null by the FK's DeleteBehavior.SetNull, not blocked/cascaded.</summary>
    public async Task<bool> RemoveExamTypeAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var examType = await _dbContext.ExamTypes.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (examType is null)
        {
            return false;
        }

        _dbContext.ExamTypes.Remove(examType);
        return true;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
