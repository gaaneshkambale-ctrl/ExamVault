using OnlineExamSystem.Exam.Application.Assignments;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Application.Sections;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Tests.Fakes;

public class FakeExamRepository : IExamRepository
{
    private readonly List<ExamPaper> _exams = [];
    private readonly List<Section> _sections = [];
    private readonly List<ExamAssignment> _assignments = [];
    private readonly List<ExamAssignmentTarget> _targets = [];
    private readonly List<ExamReminderLog> _reminderLogs = [];
    private readonly List<ExamType> _examTypes = [];
    private ReminderSettings? _reminderSettings;
    private ProctoringSettings? _proctoringSettings;
    private ExamDefaults? _examDefaults;

    public IReadOnlyList<ExamPaper> Exams => _exams;
    public IReadOnlyList<Section> Sections => _sections;
    public IReadOnlyList<ExamAssignment> Assignments => _assignments;
    public IReadOnlyList<ExamAssignmentTarget> Targets => _targets;

    public void SeedAssignment(ExamAssignment assignment, IReadOnlyList<Guid>? targetUserIds = null)
    {
        _assignments.Add(assignment);
        foreach (var userId in targetUserIds ?? [])
        {
            _targets.Add(new ExamAssignmentTarget { ExamAssignmentId = assignment.Id, UserId = userId });
        }
    }

    public Task AddAsync(ExamPaper exam, CancellationToken cancellationToken = default)
    {
        _exams.Add(exam);
        return Task.CompletedTask;
    }

    public Task<ExamPaper?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(_exams.FirstOrDefault(e => e.Id == id));

    public Task<IReadOnlyList<ExamPaper>> GetAllAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ExamPaper>>(_exams.OrderByDescending(e => e.CreatedAtUtc).ToList());

    public Task<int> CountByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_exams.Count(e => e.TenantId == tenantId));

    public Task RemoveAsync(ExamPaper exam, CancellationToken cancellationToken = default)
    {
        _exams.RemoveAll(e => e.Id == exam.Id);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<ExamPaper>> GetOwnedAsync(
        Guid createdByUserId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ExamPaper>>(
            _exams.Where(e => e.CreatedByUserId == createdByUserId).OrderByDescending(e => e.CreatedAtUtc).ToList());

    public Task AddSectionAsync(Section section, CancellationToken cancellationToken = default)
    {
        _sections.Add(section);
        return Task.CompletedTask;
    }

    public Task<Section?> GetSectionByIdAsync(Guid sectionId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_sections.FirstOrDefault(s => s.Id == sectionId));

    public Task<IReadOnlyList<Section>> GetSectionsByExamIdAsync(
        Guid examId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Section>>(
            _sections.Where(s => s.ExamId == examId).OrderBy(s => s.DisplayOrder).ToList());

    public Task<IReadOnlyList<SectionWithExamTitle>> GetAllSectionsAsync(CancellationToken cancellationToken = default)
    {
        var result = _sections
            .OrderBy(s => s.DisplayOrder)
            .Select(s => new SectionWithExamTitle(s, _exams.FirstOrDefault(e => e.Id == s.ExamId)?.Title ?? "Unknown Exam"))
            .ToList();
        return Task.FromResult<IReadOnlyList<SectionWithExamTitle>>(result);
    }

    public Task<bool> RemoveSectionAsync(Guid sectionId, CancellationToken cancellationToken = default)
    {
        var removed = _sections.RemoveAll(s => s.Id == sectionId) > 0;
        return Task.FromResult(removed);
    }

    public Task ReorderSectionsAsync(
        Guid examId,
        IReadOnlyList<SectionOrderEntry> order,
        CancellationToken cancellationToken = default)
    {
        var orderBySectionId = order.ToDictionary(o => o.SectionId, o => o.DisplayOrder);
        foreach (var section in _sections.Where(s => s.ExamId == examId && orderBySectionId.ContainsKey(s.Id)))
        {
            section.DisplayOrder = orderBySectionId[section.Id];
        }

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<ExamPaper>> GetAssignedPublishedExamsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var assignedExamIds = _assignments
            .Where(a => _targets.Any(t => t.ExamAssignmentId == a.Id && t.UserId == userId))
            .Select(a => a.ExamId)
            .ToHashSet();
        var result = _exams
            .Where(e => e.Status == ExamStatus.Published && assignedExamIds.Contains(e.Id))
            .OrderByDescending(e => e.CreatedAtUtc)
            .ToList();
        return Task.FromResult<IReadOnlyList<ExamPaper>>(result);
    }

    public Task<bool> IsUserAssignedAsync(Guid examId, Guid userId, CancellationToken cancellationToken = default)
    {
        var assignmentIds = _assignments.Where(a => a.ExamId == examId).Select(a => a.Id).ToHashSet();
        var isAssigned = _targets.Any(t => assignmentIds.Contains(t.ExamAssignmentId) && t.UserId == userId);
        return Task.FromResult(isAssigned);
    }

    public Task<ExamAssignment?> GetAssignmentForUserAndExamAsync(
        Guid examId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var assignmentIds = _assignments.Where(a => a.ExamId == examId).Select(a => a.Id).ToHashSet();
        var matchingAssignmentIds = _targets
            .Where(t => assignmentIds.Contains(t.ExamAssignmentId) && t.UserId == userId)
            .Select(t => t.ExamAssignmentId)
            .ToHashSet();
        var result = _assignments
            .Where(a => matchingAssignmentIds.Contains(a.Id))
            .OrderByDescending(a => a.CreatedAtUtc)
            .FirstOrDefault();
        return Task.FromResult(result);
    }

    public Task AddAssignmentAsync(
        ExamAssignment assignment,
        IReadOnlyList<Guid> targetUserIds,
        CancellationToken cancellationToken = default)
    {
        assignment.AssignmentNumber = _assignments.Count + 1;
        _assignments.Add(assignment);
        foreach (var userId in targetUserIds)
        {
            _targets.Add(new ExamAssignmentTarget { ExamAssignmentId = assignment.Id, UserId = userId });
        }

        return Task.CompletedTask;
    }

    public Task<ExamAssignment?> GetAssignmentByIdAsync(Guid assignmentId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_assignments.FirstOrDefault(a => a.Id == assignmentId));

    public Task ReplaceAssignmentTargetsAsync(
        Guid assignmentId,
        IReadOnlyList<Guid> targetUserIds,
        CancellationToken cancellationToken = default)
    {
        _targets.RemoveAll(t => t.ExamAssignmentId == assignmentId);
        foreach (var userId in targetUserIds)
        {
            _targets.Add(new ExamAssignmentTarget { ExamAssignmentId = assignmentId, UserId = userId });
        }

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Guid>> GetAssignmentTargetUserIdsAsync(
        Guid assignmentId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Guid>>(
            _targets.Where(t => t.ExamAssignmentId == assignmentId).Select(t => t.UserId).ToList());

    public Task<IReadOnlyList<ExamAssignment>> GetAssignmentsForExamAsync(
        Guid examId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ExamAssignment>>(
            _assignments.Where(a => a.ExamId == examId).OrderByDescending(a => a.CreatedAtUtc).ToList());

    public Task<IReadOnlyList<AssignmentWithExamTitle>> GetAllAssignmentsAsync(
        CancellationToken cancellationToken = default)
    {
        var result = _assignments
            .OrderByDescending(a => a.CreatedAtUtc)
            .Select(a => new AssignmentWithExamTitle(
                a,
                _exams.FirstOrDefault(e => e.Id == a.ExamId)?.Title ?? string.Empty,
                _targets.Count(t => t.ExamAssignmentId == a.Id)))
            .ToList();
        return Task.FromResult<IReadOnlyList<AssignmentWithExamTitle>>(result);
    }

    public Task<bool> RemoveAssignmentAsync(Guid assignmentId, CancellationToken cancellationToken = default)
    {
        var removed = _assignments.RemoveAll(a => a.Id == assignmentId) > 0;
        if (removed)
        {
            _targets.RemoveAll(t => t.ExamAssignmentId == assignmentId);
        }

        return Task.FromResult(removed);
    }

    public Task<IReadOnlyList<UpcomingAssignmentForReminder>> GetAssignmentsStartingWithinAsync(
        DateTime fromUtc,
        DateTime toUtc,
        CancellationToken cancellationToken = default)
    {
        var publishedExamIds = _exams.Where(e => e.Status == ExamStatus.Published).Select(e => e.Id).ToHashSet();
        var result = _assignments
            .Where(a => a.StartAtUtc > fromUtc && a.StartAtUtc <= toUtc && publishedExamIds.Contains(a.ExamId))
            .Select(a => new UpcomingAssignmentForReminder(
                a.TenantId,
                a.Id,
                a.ExamId,
                _exams.FirstOrDefault(e => e.Id == a.ExamId)?.Title ?? "Unknown Exam",
                a.StartAtUtc,
                _targets.Where(t => t.ExamAssignmentId == a.Id).Select(t => t.UserId).ToList()))
            .ToList();
        return Task.FromResult<IReadOnlyList<UpcomingAssignmentForReminder>>(result);
    }

    public Task<IReadOnlyList<Guid>> FilterUserIdsWithoutReminderLogAsync(
        Guid assignmentId,
        ReminderWindow window,
        IReadOnlyList<Guid> candidateUserIds,
        CancellationToken cancellationToken = default)
    {
        var alreadyLogged = _reminderLogs
            .Where(r => r.AssignmentId == assignmentId && r.Window == window)
            .Select(r => r.UserId)
            .ToHashSet();
        return Task.FromResult<IReadOnlyList<Guid>>(candidateUserIds.Where(id => !alreadyLogged.Contains(id)).ToList());
    }

    public Task AddReminderLogEntriesAsync(
        Guid tenantId,
        Guid assignmentId,
        ReminderWindow window,
        IReadOnlyList<Guid> userIds,
        CancellationToken cancellationToken = default)
    {
        foreach (var userId in userIds)
        {
            _reminderLogs.Add(new ExamReminderLog { TenantId = tenantId, AssignmentId = assignmentId, UserId = userId, Window = window });
        }

        return Task.CompletedTask;
    }

    public Task<ReminderSettings> GetOrCreateReminderSettingsAsync(CancellationToken cancellationToken = default)
    {
        _reminderSettings ??= new ReminderSettings();
        return Task.FromResult(_reminderSettings);
    }

    public Task<ReminderSettings> GetOrCreateReminderSettingsForTenantAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        _reminderSettings ??= new ReminderSettings { TenantId = tenantId };
        return Task.FromResult(_reminderSettings);
    }

    public Task<ProctoringSettings> GetOrCreateProctoringSettingsAsync(CancellationToken cancellationToken = default)
    {
        _proctoringSettings ??= new ProctoringSettings();
        return Task.FromResult(_proctoringSettings);
    }

    public Task<ExamDefaults> GetOrCreateExamDefaultsAsync(CancellationToken cancellationToken = default)
    {
        _examDefaults ??= new ExamDefaults();
        return Task.FromResult(_examDefaults);
    }

    public Task AddExamTypeAsync(ExamType examType, CancellationToken cancellationToken = default)
    {
        _examTypes.Add(examType);
        return Task.CompletedTask;
    }

    public Task<ExamType?> GetExamTypeByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(_examTypes.FirstOrDefault(t => t.Id == id));

    public Task<IReadOnlyList<ExamType>> GetAllExamTypesAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ExamType>>(_examTypes.OrderBy(t => t.Name).ToList());

    public Task<bool> RemoveExamTypeAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var removed = _examTypes.RemoveAll(t => t.Id == id) > 0;
        return Task.FromResult(removed);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
