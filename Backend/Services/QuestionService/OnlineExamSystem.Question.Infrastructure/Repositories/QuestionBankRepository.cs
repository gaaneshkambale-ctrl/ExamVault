using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Question.Domain.Enums;
using OnlineExamSystem.Question.Infrastructure.Persistence;

namespace OnlineExamSystem.Question.Infrastructure.Repositories;

public class QuestionBankRepository : IQuestionBankRepository
{
    private readonly QuestionDbContext _db;

    public QuestionBankRepository(QuestionDbContext db)
    {
        _db = db;
    }

    // ---- Subjects ----

    public async Task<IReadOnlyList<(BankSubject Subject, int TopicCount, int QuestionCount)>> ListSubjectsAsync(CancellationToken ct)
    {
        var rows = await _db.BankSubjects
            .OrderBy(s => s.Name)
            .Select(s => new
            {
                Subject = s,
                TopicCount = _db.BankTopics.Count(t => t.SubjectId == s.Id),
                QuestionCount = _db.BankQuestions.Count(q => q.SubjectId == s.Id),
            })
            .ToListAsync(ct);
        return rows.Select(r => (r.Subject, r.TopicCount, r.QuestionCount)).ToList();
    }

    public Task<BankSubject?> GetSubjectAsync(Guid id, CancellationToken ct) =>
        _db.BankSubjects.FirstOrDefaultAsync(s => s.Id == id, ct);

    public Task<bool> SubjectNameExistsAsync(string name, Guid? excludeId, CancellationToken ct) =>
        _db.BankSubjects.AnyAsync(s => s.Name == name && s.Id != excludeId, ct);

    public async Task AddSubjectAsync(BankSubject subject, CancellationToken ct) =>
        await _db.BankSubjects.AddAsync(subject, ct);

    public async Task<bool> SubjectHasDependentsAsync(Guid id, CancellationToken ct) =>
        await _db.BankTopics.AnyAsync(t => t.SubjectId == id, ct)
        || await _db.BankQuestions.AnyAsync(q => q.SubjectId == id, ct);

    public void RemoveSubject(BankSubject subject) => _db.BankSubjects.Remove(subject);

    // ---- Topics ----

    public async Task<IReadOnlyList<(BankTopic Topic, int QuestionCount)>> ListTopicsAsync(Guid? subjectId, CancellationToken ct)
    {
        var rows = await _db.BankTopics
            .Where(t => subjectId == null || t.SubjectId == subjectId)
            .OrderBy(t => t.Name)
            .Select(t => new { Topic = t, QuestionCount = _db.BankQuestions.Count(q => q.TopicId == t.Id) })
            .ToListAsync(ct);
        return rows.Select(r => (r.Topic, r.QuestionCount)).ToList();
    }

    public Task<BankTopic?> GetTopicAsync(Guid id, CancellationToken ct) =>
        _db.BankTopics.FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task<bool> TopicNameExistsAsync(Guid subjectId, string name, Guid? excludeId, CancellationToken ct) =>
        _db.BankTopics.AnyAsync(t => t.SubjectId == subjectId && t.Name == name && t.Id != excludeId, ct);

    public async Task AddTopicAsync(BankTopic topic, CancellationToken ct) =>
        await _db.BankTopics.AddAsync(topic, ct);

    public Task<bool> TopicHasQuestionsAsync(Guid id, CancellationToken ct) =>
        _db.BankQuestions.AnyAsync(q => q.TopicId == id, ct);

    public void RemoveTopic(BankTopic topic) => _db.BankTopics.Remove(topic);

    // ---- Tags ----

    public async Task<IReadOnlyList<(BankTag Tag, int QuestionCount)>> ListTagsAsync(CancellationToken ct)
    {
        var rows = await _db.BankTags
            .OrderBy(t => t.Name)
            .Select(t => new { Tag = t, QuestionCount = _db.BankQuestionTags.Count(l => l.TagId == t.Id) })
            .ToListAsync(ct);
        return rows.Select(r => (r.Tag, r.QuestionCount)).ToList();
    }

    public Task<BankTag?> GetTagAsync(Guid id, CancellationToken ct) =>
        _db.BankTags.FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task<bool> TagNameExistsAsync(string name, CancellationToken ct) =>
        _db.BankTags.AnyAsync(t => t.Name == name, ct);

    public Task<int> CountExistingTagsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct) =>
        _db.BankTags.CountAsync(t => ids.Contains(t.Id), ct);

    public async Task AddTagAsync(BankTag tag, CancellationToken ct) =>
        await _db.BankTags.AddAsync(tag, ct);

    public async Task RemoveTagAsync(BankTag tag, CancellationToken ct)
    {
        var links = await _db.BankQuestionTags.Where(l => l.TagId == tag.Id).ToListAsync(ct);
        _db.BankQuestionTags.RemoveRange(links);
        _db.BankTags.Remove(tag);
    }

    // ---- Questions ----

    public async Task<BankQuestionPage> ListQuestionsAsync(BankQuestionFilter f, CancellationToken ct)
    {
        var query = _db.BankQuestions.AsQueryable();

        if (!string.IsNullOrWhiteSpace(f.Search))
        {
            var term = f.Search.Trim();
            query = query.Where(q => q.QuestionText.Contains(term));
        }
        if (f.SubjectId is { } subjectId) query = query.Where(q => q.SubjectId == subjectId);
        if (f.TopicId is { } topicId) query = query.Where(q => q.TopicId == topicId);
        if (f.QuestionType is { } type) query = query.Where(q => q.QuestionType == type);
        if (f.Difficulty is { } difficulty) query = query.Where(q => q.Difficulty == difficulty);
        if (f.Status is { } status) query = query.Where(q => q.Status == status);
        if (f.CreatedByUserId is { } createdBy) query = query.Where(q => q.CreatedByUserId == createdBy);
        if (f.TagId is { } tagId)
            query = query.Where(q => _db.BankQuestionTags.Any(l => l.QuestionId == q.Id && l.TagId == tagId));

        var total = await query.CountAsync(ct);
        var questions = await query
            .OrderByDescending(q => q.CreatedAtUtc)
            .ThenBy(q => q.Id)
            .Skip((f.Page - 1) * f.PageSize)
            .Take(f.PageSize)
            .ToListAsync(ct);

        var items = await BuildAggregatesAsync(questions, ct, f.ExamId);
        return new BankQuestionPage(items, total);
    }

    public async Task<IReadOnlyList<BankQuestion>> GetQuestionsByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct) =>
        await _db.BankQuestions.Where(q => ids.Contains(q.Id)).ToListAsync(ct);

    public Task<BankQuestion?> GetQuestionAsync(Guid id, CancellationToken ct) =>
        _db.BankQuestions.FirstOrDefaultAsync(q => q.Id == id, ct);

    public async Task<BankQuestionAggregate?> GetQuestionAggregateAsync(Guid id, CancellationToken ct)
    {
        var question = await _db.BankQuestions.AsNoTracking().FirstOrDefaultAsync(q => q.Id == id, ct);
        if (question is null) return null;
        return (await BuildAggregatesAsync([question], ct))[0];
    }

    public async Task AddQuestionAsync(
        BankQuestion question, IReadOnlyList<BankQuestionOption> options, IReadOnlyCollection<Guid> tagIds, CancellationToken ct)
    {
        await _db.BankQuestions.AddAsync(question, ct);
        await _db.BankQuestionOptions.AddRangeAsync(options, ct);
        await _db.BankQuestionTags.AddRangeAsync(
            tagIds.Select(tagId => new BankQuestionTag { QuestionId = question.Id, TagId = tagId }), ct);
    }

    public async Task ReplaceQuestionChildrenAsync(
        Guid questionId, IReadOnlyList<BankQuestionOption> options, IReadOnlyCollection<Guid> tagIds, CancellationToken ct)
    {
        _db.BankQuestionOptions.RemoveRange(await _db.BankQuestionOptions.Where(o => o.QuestionId == questionId).ToListAsync(ct));
        _db.BankQuestionTags.RemoveRange(await _db.BankQuestionTags.Where(l => l.QuestionId == questionId).ToListAsync(ct));
        await _db.BankQuestionOptions.AddRangeAsync(options, ct);
        await _db.BankQuestionTags.AddRangeAsync(
            tagIds.Select(tagId => new BankQuestionTag { QuestionId = questionId, TagId = tagId }), ct);
    }

    // Options/tag links cascade at the FK level (configured in the DbContext).
    public void RemoveQuestion(BankQuestion question) => _db.BankQuestions.Remove(question);

    public async Task<IReadOnlyList<BankQuestionAggregate>> GetAggregatesByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct)
    {
        var questions = await _db.BankQuestions.AsNoTracking().Where(q => ids.Contains(q.Id)).ToListAsync(ct);
        return await BuildAggregatesAsync(questions, ct);
    }

    public async Task<HashSet<Guid>> GetBankIdsAlreadyInExamAsync(Guid examId, IReadOnlyCollection<Guid> bankQuestionIds, CancellationToken ct) =>
        (await _db.Questions
            .Where(q => q.ExamId == examId && q.SourceBankQuestionId != null && bankQuestionIds.Contains(q.SourceBankQuestionId.Value))
            .Select(q => q.SourceBankQuestionId!.Value)
            .ToListAsync(ct))
        .ToHashSet();

    public async Task<IReadOnlyList<Guid>> GetRandomCandidateIdsAsync(
        Guid examId, Guid subjectId, Guid? topicId, QuestionType? questionType, QuestionDifficulty? difficulty, CancellationToken ct) =>
        await _db.BankQuestions
            .Where(q => q.Status == BankQuestionStatus.Active
                && q.SubjectId == subjectId
                && (topicId == null || q.TopicId == topicId)
                && (questionType == null || q.QuestionType == questionType)
                && (difficulty == null || q.Difficulty == difficulty)
                && !_db.Questions.Any(e => e.ExamId == examId && e.SourceBankQuestionId == q.Id))
            .Select(q => q.Id)
            .ToListAsync(ct);

    public async Task AddExamCopiesAsync(IReadOnlyList<ExamCopy> copies, CancellationToken ct)
    {
        await _db.Questions.AddRangeAsync(copies.Select(c => c.Question), ct);
        await _db.QuestionOptions.AddRangeAsync(copies.SelectMany(c => c.Options), ct);
        await _db.QuestionParameters.AddRangeAsync(copies.SelectMany(c => c.Parameters), ct);
        await _db.QuestionTestCases.AddRangeAsync(copies.SelectMany(c => c.TestCases), ct);
        await _db.QuestionSqlTestCases.AddRangeAsync(copies.SelectMany(c => c.SqlTestCases), ct);
    }

    public Task SaveChangesAsync(CancellationToken ct) => _db.SaveChangesAsync(ct);

    private async Task<List<BankQuestionAggregate>> BuildAggregatesAsync(List<BankQuestion> questions, CancellationToken ct, Guid? examId = null)
    {
        var ids = questions.Select(q => q.Id).ToList();
        var usage = (await _db.Questions.AsNoTracking()
                .Where(e => e.SourceBankQuestionId != null && ids.Contains(e.SourceBankQuestionId.Value))
                .GroupBy(e => e.SourceBankQuestionId!.Value)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToListAsync(ct))
            .ToDictionary(x => x.Id, x => x.Count);
        var inExam = examId is { } exam
            ? await GetBankIdsAlreadyInExamAsync(exam, ids, ct)
            : [];
        var options = (await _db.BankQuestionOptions.AsNoTracking()
                .Where(o => ids.Contains(o.QuestionId))
                .OrderBy(o => o.DisplayOrder)
                .ToListAsync(ct))
            .ToLookup(o => o.QuestionId);
        var tagRows = await (from l in _db.BankQuestionTags.AsNoTracking()
                             join t in _db.BankTags.AsNoTracking() on l.TagId equals t.Id
                             where ids.Contains(l.QuestionId)
                             orderby t.Name
                             select new { l.QuestionId, Tag = t })
            .ToListAsync(ct);
        var tags = tagRows.ToLookup(r => r.QuestionId, r => r.Tag);

        return questions
            .Select(q => new BankQuestionAggregate(q, options[q.Id].ToList(), tags[q.Id].ToList(), usage.GetValueOrDefault(q.Id), inExam.Contains(q.Id)))
            .ToList();
    }
}
