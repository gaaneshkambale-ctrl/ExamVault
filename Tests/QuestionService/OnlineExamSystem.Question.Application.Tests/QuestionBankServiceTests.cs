using Microsoft.Extensions.Logging.Abstractions;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Application.QuestionBank;
using OnlineExamSystem.Question.Application.Questions.Create;
using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Question.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

// Partial: the Code/Programming tests live in QuestionBankCodeTests.cs and share
// this class's helpers and in-memory repository.
public partial class QuestionBankServiceTests
{
    private static readonly BankCaller Admin = new(Guid.NewGuid(), true);
    private static readonly BankCaller Teacher = new(Guid.NewGuid(), false);
    private static readonly BankCaller OtherTeacher = new(Guid.NewGuid(), false);

    private readonly InMemoryBankRepository _repo = new();
    private readonly CannedSqlClient _sql = new();
    private readonly QuestionBankService _service;

    public QuestionBankServiceTests()
    {
        _service = new QuestionBankService(
            _repo,
            new SaveBankQuestionValidator(),
            new CreateQuestionValidator(),
            _sql,
            NullLogger<QuestionBankService>.Instance);
    }

    private static SaveBankQuestionCommand Command(
        Guid subjectId,
        Guid? topicId = null,
        string type = "MultipleChoice",
        IReadOnlyList<BankOptionInput>? options = null,
        int marks = 2,
        decimal negative = 0,
        IReadOnlyList<Guid>? tags = null) =>
        new(subjectId, topicId, type, "What is normalization?", null, "Medium", marks, negative, false, "Draft",
            options ?? [new("A", true), new("B", false)], tags ?? []);

    private async Task<BankSubject> SubjectAsync(string name = "DBMS") =>
        (await _service.CreateSubjectAsync(name, null, Admin.UserId, default)).Value!;

    [Fact]
    public async Task Subject_names_must_be_unique_and_non_empty()
    {
        await SubjectAsync();

        Assert.Equal(BankOutcome.Conflict, (await _service.CreateSubjectAsync("DBMS", null, Admin.UserId, default)).Outcome);
        Assert.Equal(BankOutcome.Invalid, (await _service.CreateSubjectAsync("  ", null, Admin.UserId, default)).Outcome);
    }

    [Fact]
    public async Task Topic_names_are_unique_per_subject_not_globally()
    {
        var dbms = await SubjectAsync();
        var os = await SubjectAsync("OS");

        Assert.Equal(BankOutcome.Ok, (await _service.CreateTopicAsync(dbms.Id, "Basics", Admin.UserId, default)).Outcome);
        Assert.Equal(BankOutcome.Conflict, (await _service.CreateTopicAsync(dbms.Id, "Basics", Admin.UserId, default)).Outcome);
        Assert.Equal(BankOutcome.Ok, (await _service.CreateTopicAsync(os.Id, "Basics", Admin.UserId, default)).Outcome);
    }

    [Fact]
    public async Task Subject_with_a_topic_or_question_cannot_be_deleted()
    {
        var subject = await SubjectAsync();
        await _service.CreateTopicAsync(subject.Id, "SQL", Admin.UserId, default);

        Assert.Equal(BankOutcome.Conflict, (await _service.DeleteSubjectAsync(subject.Id, default)).Outcome);
    }

    [Fact]
    public async Task Valid_question_is_created_with_options_and_tags()
    {
        var subject = await SubjectAsync();
        var tag = (await _service.CreateTagAsync("exam-prep", Admin.UserId, default)).Value!;

        var result = await _service.CreateQuestionAsync(Command(subject.Id, tags: [tag.Id]), Teacher, default);

        Assert.Equal(BankOutcome.Ok, result.Outcome);
        Assert.Equal(Teacher.UserId, result.Value!.Question.CreatedByUserId);
        Assert.Equal(2, result.Value.Options.Count);
        Assert.Single(result.Value.Tags);
    }

    [Fact]
    public async Task Unknown_subject_or_tag_is_rejected()
    {
        var subject = await SubjectAsync();

        Assert.Equal(BankOutcome.Invalid, (await _service.CreateQuestionAsync(Command(Guid.NewGuid()), Teacher, default)).Outcome);
        Assert.Equal(BankOutcome.Invalid, (await _service.CreateQuestionAsync(Command(subject.Id, tags: [Guid.NewGuid()]), Teacher, default)).Outcome);
    }

    [Fact]
    public async Task Topic_must_belong_to_the_selected_subject()
    {
        var dbms = await SubjectAsync();
        var os = await SubjectAsync("OS");
        var osTopic = (await _service.CreateTopicAsync(os.Id, "Scheduling", Admin.UserId, default)).Value!;

        var result = await _service.CreateQuestionAsync(Command(dbms.Id, osTopic.Id), Teacher, default);

        Assert.Equal(BankOutcome.Invalid, result.Outcome);
    }

    [Theory]
    [InlineData("MultipleChoice", 0)]
    [InlineData("MultipleChoice", 2)]
    [InlineData("MultiSelect", 1)]
    public async Task Correct_option_count_is_enforced_per_type(string type, int correctCount)
    {
        var subject = await SubjectAsync();
        var options = Enumerable.Range(0, 4).Select(i => new BankOptionInput($"Opt{i}", i < correctCount)).ToList();

        var result = await _service.CreateQuestionAsync(Command(subject.Id, type: type, options: options), Teacher, default);

        Assert.Equal(BankOutcome.Invalid, result.Outcome);
    }

    [Fact]
    public async Task Negative_marks_cannot_exceed_default_marks()
    {
        var subject = await SubjectAsync();

        var result = await _service.CreateQuestionAsync(Command(subject.Id, marks: 2, negative: 3), Teacher, default);

        Assert.Equal(BankOutcome.Invalid, result.Outcome);
    }

    [Fact]
    public async Task Instructor_can_edit_own_question_but_not_a_colleagues()
    {
        var subject = await SubjectAsync();
        var created = (await _service.CreateQuestionAsync(Command(subject.Id), Teacher, default)).Value!.Question;

        Assert.Equal(BankOutcome.Ok, (await _service.UpdateQuestionAsync(created.Id, Command(subject.Id, marks: 3), Teacher, default)).Outcome);
        Assert.Equal(BankOutcome.Forbidden, (await _service.UpdateQuestionAsync(created.Id, Command(subject.Id, marks: 4), OtherTeacher, default)).Outcome);
        Assert.Equal(BankOutcome.Ok, (await _service.UpdateQuestionAsync(created.Id, Command(subject.Id, marks: 5), Admin, default)).Outcome);
    }

    [Fact]
    public async Task Update_replaces_options_and_stamps_the_editor()
    {
        var subject = await SubjectAsync();
        var created = (await _service.CreateQuestionAsync(Command(subject.Id), Teacher, default)).Value!.Question;

        var updated = (await _service.UpdateQuestionAsync(
            created.Id,
            Command(subject.Id, options: [new("X", false), new("Y", true), new("Z", false)]),
            Admin,
            default)).Value!;

        Assert.Equal(3, updated.Options.Count);
        Assert.Equal(Admin.UserId, updated.Question.UpdatedByUserId);
        Assert.NotNull(updated.Question.UpdatedAtUtc);
    }

    [Fact]
    public async Task Deleting_a_tag_unlinks_it_from_questions()
    {
        var subject = await SubjectAsync();
        var tag = (await _service.CreateTagAsync("t", Admin.UserId, default)).Value!;
        var created = (await _service.CreateQuestionAsync(Command(subject.Id, tags: [tag.Id]), Teacher, default)).Value!.Question;

        await _service.DeleteTagAsync(tag.Id, default);

        Assert.Empty((await _service.GetQuestionAsync(created.Id, default))!.Tags);
    }

    [Fact]
    public async Task List_filters_by_search_and_mine_and_clamps_page_size()
    {
        var subject = await SubjectAsync();
        await _service.CreateQuestionAsync(Command(subject.Id) with { QuestionText = "Define ACID" }, Teacher, default);
        await _service.CreateQuestionAsync(Command(subject.Id) with { QuestionText = "Define BCNF" }, OtherTeacher, default);

        var search = await _service.ListQuestionsAsync(new BankQuestionFilter("acid", null, null, null, null, null, null, null, 1, 10), default);
        var mine = await _service.ListQuestionsAsync(new BankQuestionFilter(null, null, null, null, null, null, null, OtherTeacher.UserId, 1, 10000), default);

        Assert.Single(search.Items);
        Assert.Single(mine.Items);
        Assert.Equal(100, _repo.LastPageSize);
    }

    private async Task<BankQuestion> ActiveQuestionAsync(Guid subjectId, string status = "Active", string text = "Define 2NF")
    {
        var result = await _service.CreateQuestionAsync(Command(subjectId, marks: 3) with { QuestionText = text, Status = status }, Teacher, default);
        return result.Value!.Question;
    }

    [Fact]
    public async Task Adding_to_exam_copies_the_question_and_its_options()
    {
        var subject = await SubjectAsync();
        var bank = await ActiveQuestionAsync(subject.Id);
        var examId = Guid.NewGuid();
        var sectionId = Guid.NewGuid();

        var result = await _service.AddToExamAsync(examId, sectionId, [bank.Id], Admin.UserId, default);

        Assert.Equal(1, result.Value!.Added);
        var copy = Assert.Single(_repo.ExamCopies);
        Assert.Equal(examId, copy.ExamId);
        Assert.Equal(sectionId, copy.SectionId);
        Assert.Equal(bank.Id, copy.SourceBankQuestionId);
        Assert.Equal(3, copy.Marks);
        Assert.Equal("Define 2NF", copy.QuestionText);
        Assert.Equal(Admin.UserId, copy.CreatedByUserId);
        Assert.Equal(2, _repo.ExamCopyOptions.Count(o => o.QuestionId == copy.Id));
        Assert.Single(_repo.ExamCopyOptions.Where(o => o.QuestionId == copy.Id && o.IsCorrect));
    }

    [Fact]
    public async Task Editing_the_bank_question_afterwards_does_not_change_the_exam_copy()
    {
        var subject = await SubjectAsync();
        var bank = await ActiveQuestionAsync(subject.Id);
        await _service.AddToExamAsync(Guid.NewGuid(), null, [bank.Id], Admin.UserId, default);

        await _service.UpdateQuestionAsync(bank.Id, Command(subject.Id, marks: 9) with { QuestionText = "Rewritten", Status = "Active" }, Admin, default);

        var copy = Assert.Single(_repo.ExamCopies);
        Assert.Equal("Define 2NF", copy.QuestionText);
        Assert.Equal(3, copy.Marks);
    }

    [Fact]
    public async Task Draft_archived_missing_and_already_added_questions_are_skipped_not_failed()
    {
        var subject = await SubjectAsync();
        var active = await ActiveQuestionAsync(subject.Id, "Active", "A");
        var draft = await ActiveQuestionAsync(subject.Id, "Draft", "B");
        var archived = await ActiveQuestionAsync(subject.Id, "Archived", "C");
        var examId = Guid.NewGuid();
        await _service.AddToExamAsync(examId, null, [active.Id], Admin.UserId, default);

        var result = (await _service.AddToExamAsync(examId, null, [active.Id, draft.Id, archived.Id, Guid.NewGuid()], Admin.UserId, default)).Value!;

        Assert.Equal(0, result.Added);
        Assert.Equal(4, result.Skipped.Count);
        Assert.Contains(result.Skipped, s => s.BankQuestionId == active.Id && s.Reason == "Already in this exam.");
        Assert.Single(_repo.ExamCopies);
    }

    [Fact]
    public async Task Same_bank_question_can_go_into_a_different_exam()
    {
        var subject = await SubjectAsync();
        var bank = await ActiveQuestionAsync(subject.Id);

        await _service.AddToExamAsync(Guid.NewGuid(), null, [bank.Id], Admin.UserId, default);
        var second = await _service.AddToExamAsync(Guid.NewGuid(), null, [bank.Id], Admin.UserId, default);

        Assert.Equal(1, second.Value!.Added);
        Assert.Equal(2, _repo.ExamCopies.Count);
    }

    [Fact]
    public async Task Add_to_exam_rejects_empty_missing_exam_and_oversized_batches()
    {
        Assert.Equal(BankOutcome.Invalid, (await _service.AddToExamAsync(Guid.NewGuid(), null, [], Admin.UserId, default)).Outcome);
        Assert.Equal(BankOutcome.Invalid, (await _service.AddToExamAsync(Guid.Empty, null, [Guid.NewGuid()], Admin.UserId, default)).Outcome);
        var tooMany = Enumerable.Range(0, QuestionBankService.MaxAddToExamBatch + 1).Select(_ => Guid.NewGuid()).ToList();
        Assert.Equal(BankOutcome.Invalid, (await _service.AddToExamAsync(Guid.NewGuid(), null, tooMany, Admin.UserId, default)).Outcome);
    }

    private sealed class InMemoryBankRepository : IQuestionBankRepository
    {
        private readonly List<BankSubject> _subjects = [];
        private readonly List<BankTopic> _topics = [];
        private readonly List<BankTag> _tags = [];
        private readonly List<BankQuestion> _questions = [];
        private readonly List<BankQuestionOption> _options = [];
        private readonly List<BankQuestionTag> _links = [];

        public int LastPageSize { get; private set; }

        public Task<IReadOnlyList<(BankSubject, int, int)>> ListSubjectsAsync(CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<(BankSubject, int, int)>>(_subjects
                .Select(s => (s, _topics.Count(t => t.SubjectId == s.Id), _questions.Count(q => q.SubjectId == s.Id))).ToList());
        public Task<BankSubject?> GetSubjectAsync(Guid id, CancellationToken ct) => Task.FromResult(_subjects.FirstOrDefault(s => s.Id == id));
        public Task<bool> SubjectNameExistsAsync(string name, Guid? excludeId, CancellationToken ct) =>
            Task.FromResult(_subjects.Any(s => s.Name == name && s.Id != excludeId));
        public Task AddSubjectAsync(BankSubject subject, CancellationToken ct) { _subjects.Add(subject); return Task.CompletedTask; }
        public Task<bool> SubjectHasDependentsAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(_topics.Any(t => t.SubjectId == id) || _questions.Any(q => q.SubjectId == id));
        public void RemoveSubject(BankSubject subject) => _subjects.Remove(subject);

        public Task<IReadOnlyList<(BankTopic, int)>> ListTopicsAsync(Guid? subjectId, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<(BankTopic, int)>>(_topics
                .Where(t => subjectId == null || t.SubjectId == subjectId)
                .Select(t => (t, _questions.Count(q => q.TopicId == t.Id))).ToList());
        public Task<BankTopic?> GetTopicAsync(Guid id, CancellationToken ct) => Task.FromResult(_topics.FirstOrDefault(t => t.Id == id));
        public Task<bool> TopicNameExistsAsync(Guid subjectId, string name, Guid? excludeId, CancellationToken ct) =>
            Task.FromResult(_topics.Any(t => t.SubjectId == subjectId && t.Name == name && t.Id != excludeId));
        public Task AddTopicAsync(BankTopic topic, CancellationToken ct) { _topics.Add(topic); return Task.CompletedTask; }
        public Task<bool> TopicHasQuestionsAsync(Guid id, CancellationToken ct) => Task.FromResult(_questions.Any(q => q.TopicId == id));
        public void RemoveTopic(BankTopic topic) => _topics.Remove(topic);

        public Task<IReadOnlyList<(BankTag, int)>> ListTagsAsync(CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<(BankTag, int)>>(_tags.Select(t => (t, _links.Count(l => l.TagId == t.Id))).ToList());
        public Task<BankTag?> GetTagAsync(Guid id, CancellationToken ct) => Task.FromResult(_tags.FirstOrDefault(t => t.Id == id));
        public Task<bool> TagNameExistsAsync(string name, CancellationToken ct) => Task.FromResult(_tags.Any(t => t.Name == name));
        public Task<int> CountExistingTagsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct) =>
            Task.FromResult(_tags.Count(t => ids.Contains(t.Id)));
        public Task AddTagAsync(BankTag tag, CancellationToken ct) { _tags.Add(tag); return Task.CompletedTask; }
        public Task RemoveTagAsync(BankTag tag, CancellationToken ct)
        {
            _links.RemoveAll(l => l.TagId == tag.Id);
            _tags.Remove(tag);
            return Task.CompletedTask;
        }

        public Task<BankQuestionPage> ListQuestionsAsync(BankQuestionFilter f, CancellationToken ct)
        {
            LastPageSize = f.PageSize;
            var query = _questions.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(f.Search)) query = query.Where(q => q.QuestionText.Contains(f.Search, StringComparison.OrdinalIgnoreCase));
            if (f.CreatedByUserId is { } by) query = query.Where(q => q.CreatedByUserId == by);
            var all = query.ToList();
            return Task.FromResult(new BankQuestionPage(all.Select(Aggregate).ToList(), all.Count));
        }
        public Task<IReadOnlyList<Guid>> GetRandomCandidateIdsAsync(
            Guid examId, Guid subjectId, Guid? topicId, QuestionType? questionType, QuestionDifficulty? difficulty, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<Guid>>(_questions
                .Where(q => q.Status == BankQuestionStatus.Active
                    && q.SubjectId == subjectId
                    && (topicId == null || q.TopicId == topicId)
                    && (questionType == null || q.QuestionType == questionType)
                    && (difficulty == null || q.Difficulty == difficulty)
                    && !ExamCopies.Any(e => e.ExamId == examId && e.SourceBankQuestionId == q.Id))
                .Select(q => q.Id)
                .ToList());

        public Task<IReadOnlyList<BankQuestion>> GetQuestionsByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<BankQuestion>>(_questions.Where(q => ids.Contains(q.Id)).ToList());
        public Task<BankQuestion?> GetQuestionAsync(Guid id, CancellationToken ct) => Task.FromResult(_questions.FirstOrDefault(q => q.Id == id));
        public Task<BankQuestionAggregate?> GetQuestionAggregateAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(_questions.FirstOrDefault(q => q.Id == id) is { } q ? Aggregate(q) : null);
        public Task AddQuestionAsync(BankQuestion question, IReadOnlyList<BankQuestionOption> options, IReadOnlyCollection<Guid> tagIds, CancellationToken ct)
        {
            _questions.Add(question);
            _options.AddRange(options);
            _links.AddRange(tagIds.Select(t => new BankQuestionTag { QuestionId = question.Id, TagId = t }));
            return Task.CompletedTask;
        }
        public Task ReplaceQuestionChildrenAsync(Guid questionId, IReadOnlyList<BankQuestionOption> options, IReadOnlyCollection<Guid> tagIds, CancellationToken ct)
        {
            _options.RemoveAll(o => o.QuestionId == questionId);
            _links.RemoveAll(l => l.QuestionId == questionId);
            _options.AddRange(options);
            _links.AddRange(tagIds.Select(t => new BankQuestionTag { QuestionId = questionId, TagId = t }));
            return Task.CompletedTask;
        }
        public List<ExamQuestion> ExamCopies { get; } = [];
        public List<QuestionOption> ExamCopyOptions { get; } = [];
        public List<QuestionParameter> ExamCopyParameters { get; } = [];
        public List<QuestionTestCase> ExamCopyTestCases { get; } = [];
        public List<QuestionSqlTestCase> ExamCopySqlTestCases { get; } = [];

        public Task<IReadOnlyList<BankQuestionAggregate>> GetAggregatesByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<BankQuestionAggregate>>(_questions.Where(q => ids.Contains(q.Id)).Select(Aggregate).ToList());
        public Task<HashSet<Guid>> GetBankIdsAlreadyInExamAsync(Guid examId, IReadOnlyCollection<Guid> bankQuestionIds, CancellationToken ct) =>
            Task.FromResult(ExamCopies
                .Where(e => e.ExamId == examId && e.SourceBankQuestionId is { } s && bankQuestionIds.Contains(s))
                .Select(e => e.SourceBankQuestionId!.Value).ToHashSet());
        public Task AddExamCopiesAsync(IReadOnlyList<ExamCopy> copies, CancellationToken ct)
        {
            ExamCopies.AddRange(copies.Select(c => c.Question));
            ExamCopyOptions.AddRange(copies.SelectMany(c => c.Options));
            ExamCopyParameters.AddRange(copies.SelectMany(c => c.Parameters));
            ExamCopyTestCases.AddRange(copies.SelectMany(c => c.TestCases));
            ExamCopySqlTestCases.AddRange(copies.SelectMany(c => c.SqlTestCases));
            return Task.CompletedTask;
        }

        public void RemoveQuestion(BankQuestion question) => _questions.Remove(question);
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;

        private BankQuestionAggregate Aggregate(BankQuestion q) => new(
            q,
            _options.Where(o => o.QuestionId == q.Id).OrderBy(o => o.DisplayOrder).ToList(),
            _links.Where(l => l.QuestionId == q.Id).Select(l => _tags.First(t => t.Id == l.TagId)).ToList());
    }
}
