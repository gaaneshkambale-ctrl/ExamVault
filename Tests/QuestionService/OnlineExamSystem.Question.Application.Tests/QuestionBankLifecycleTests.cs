using OnlineExamSystem.Question.Application.QuestionBank;
using OnlineExamSystem.Question.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

// Duplicate + bulk status change.
public partial class QuestionBankServiceTests
{
    [Fact]
    public async Task Duplicate_makes_a_draft_copy_owned_by_the_caller_with_options_and_tags()
    {
        var subject = await SubjectAsync();
        var tag = (await _service.CreateTagAsync("midterm", Admin.UserId, default)).Value!;
        var source = (await _service.CreateQuestionAsync(
            Command(subject.Id, tags: [tag.Id]) with { Status = "Active", Explanation = "because" }, Teacher, default)).Value!.Question;

        var result = await _service.DuplicateQuestionAsync(source.Id, OtherTeacher, default);

        Assert.Equal(BankOutcome.Ok, result.Outcome);
        var copy = result.Value!;
        Assert.NotEqual(source.Id, copy.Question.Id);
        Assert.Equal(BankQuestionStatus.Draft, copy.Question.Status);
        Assert.Equal(OtherTeacher.UserId, copy.Question.CreatedByUserId);
        Assert.Equal(source.QuestionText + " (copy)", copy.Question.QuestionText);
        Assert.Equal("because", copy.Question.Explanation);
        Assert.Equal(source.DefaultMarks, copy.Question.DefaultMarks);
        Assert.Equal(2, copy.Options.Count);
        Assert.Single(copy.Options, o => o.IsCorrect);
        Assert.Equal([tag.Id], copy.Tags.Select(t => t.Id));
        Assert.NotEqual(source.Id, copy.Options[0].QuestionId);
    }

    [Fact]
    public async Task Duplicate_leaves_the_original_untouched_and_still_active()
    {
        var subject = await SubjectAsync();
        var source = (await _service.CreateQuestionAsync(Command(subject.Id) with { Status = "Active" }, Teacher, default)).Value!.Question;

        await _service.DuplicateQuestionAsync(source.Id, Teacher, default);

        var original = (await _service.GetQuestionAsync(source.Id, default))!.Question;
        Assert.Equal(BankQuestionStatus.Active, original.Status);
        Assert.Equal("What is normalization?", original.QuestionText);
        Assert.Equal(2, (await _service.ListQuestionsAsync(new(null, null, null, null, null, null, null, null, 1, 50), default)).Total);
    }

    [Fact]
    public async Task Duplicate_keeps_code_details_including_precomputed_sql_output()
    {
        var subject = await SubjectAsync();
        var source = (await _service.CreateQuestionAsync(CodeCommand(subject.Id, SqlSpec(), bearer: "t"), Teacher, default)).Value!.Question;

        var copy = (await _service.DuplicateQuestionAsync(source.Id, Admin, default)).Value!.Question;

        Assert.Equal(source.CodeSpecJson, copy.CodeSpecJson);
        Assert.Equal("rows-0", BankCodeSpec.FromJson(copy.CodeSpecJson)!.SqlTestCases[0].ExpectedOutput);
    }

    [Fact]
    public async Task Duplicate_truncates_a_maximum_length_question_so_the_copy_still_fits()
    {
        var subject = await SubjectAsync();
        var source = (await _service.CreateQuestionAsync(Command(subject.Id) with { QuestionText = new string('x', 2000) }, Teacher, default)).Value!.Question;

        var copy = (await _service.DuplicateQuestionAsync(source.Id, Teacher, default)).Value!.Question;

        Assert.Equal(2000, copy.QuestionText.Length);
        Assert.EndsWith(" (copy)", copy.QuestionText);
    }

    [Fact]
    public async Task Duplicate_of_a_missing_question_is_not_found()
    {
        Assert.Equal(BankOutcome.NotFound, (await _service.DuplicateQuestionAsync(Guid.NewGuid(), Admin, default)).Outcome);
    }

    [Fact]
    public async Task Bulk_archive_updates_every_owned_question_and_stamps_the_editor()
    {
        var subject = await SubjectAsync();
        var a = (await _service.CreateQuestionAsync(Command(subject.Id) with { Status = "Active" }, Teacher, default)).Value!.Question;
        var b = (await _service.CreateQuestionAsync(Command(subject.Id) with { Status = "Active" }, Teacher, default)).Value!.Question;

        var result = await _service.SetStatusAsync([a.Id, b.Id], "Archived", Teacher, default);

        Assert.Equal(2, result.Value!.Updated);
        Assert.Empty(result.Value.Skipped);
        Assert.All([a, b], q =>
        {
            Assert.Equal(BankQuestionStatus.Archived, q.Status);
            Assert.Equal(Teacher.UserId, q.UpdatedByUserId);
            Assert.NotNull(q.UpdatedAtUtc);
        });
    }

    [Fact]
    public async Task Bulk_status_skips_a_colleagues_questions_for_an_instructor_but_not_for_an_admin()
    {
        var subject = await SubjectAsync();
        var mine = (await _service.CreateQuestionAsync(Command(subject.Id) with { Status = "Active" }, Teacher, default)).Value!.Question;
        var theirs = (await _service.CreateQuestionAsync(Command(subject.Id) with { Status = "Active" }, OtherTeacher, default)).Value!.Question;

        var asTeacher = (await _service.SetStatusAsync([mine.Id, theirs.Id], "Archived", Teacher, default)).Value!;

        Assert.Equal(1, asTeacher.Updated);
        Assert.Equal(theirs.Id, Assert.Single(asTeacher.Skipped).BankQuestionId);
        Assert.Equal(BankQuestionStatus.Active, theirs.Status);

        var asAdmin = (await _service.SetStatusAsync([theirs.Id], "Archived", Admin, default)).Value!;
        Assert.Equal(1, asAdmin.Updated);
        Assert.Equal(BankQuestionStatus.Archived, theirs.Status);
    }

    [Fact]
    public async Task Bulk_status_reports_missing_ids_as_skipped_without_failing_the_batch()
    {
        var subject = await SubjectAsync();
        var real = (await _service.CreateQuestionAsync(Command(subject.Id), Teacher, default)).Value!.Question;
        var missing = Guid.NewGuid();

        var result = (await _service.SetStatusAsync([real.Id, missing], "Active", Teacher, default)).Value!;

        Assert.Equal(1, result.Updated);
        Assert.Equal(missing, Assert.Single(result.Skipped).BankQuestionId);
    }

    [Fact]
    public async Task Bulk_status_rejects_a_bad_status_an_empty_selection_and_an_oversized_batch()
    {
        var id = Guid.NewGuid();
        Assert.Equal(BankOutcome.Invalid, (await _service.SetStatusAsync([id], "Deleted", Admin, default)).Outcome);
        Assert.Equal(BankOutcome.Invalid, (await _service.SetStatusAsync([id], "7", Admin, default)).Outcome);
        Assert.Equal(BankOutcome.Invalid, (await _service.SetStatusAsync([], "Archived", Admin, default)).Outcome);
        var tooMany = Enumerable.Range(0, QuestionBankService.MaxBulkBatch + 1).Select(_ => Guid.NewGuid()).ToList();
        Assert.Equal(BankOutcome.Invalid, (await _service.SetStatusAsync(tooMany, "Archived", Admin, default)).Outcome);
    }

    [Fact]
    public async Task An_archived_question_can_no_longer_be_added_to_an_exam_until_reactivated()
    {
        var subject = await SubjectAsync();
        var q = (await _service.CreateQuestionAsync(Command(subject.Id) with { Status = "Active" }, Teacher, default)).Value!.Question;
        await _service.SetStatusAsync([q.Id], "Archived", Teacher, default);

        var blocked = (await _service.AddToExamAsync(Guid.NewGuid(), null, [q.Id], Admin.UserId, default)).Value!;
        await _service.SetStatusAsync([q.Id], "Active", Teacher, default);
        var allowed = (await _service.AddToExamAsync(Guid.NewGuid(), null, [q.Id], Admin.UserId, default)).Value!;

        Assert.Equal(0, blocked.Added);
        Assert.Equal(1, allowed.Added);
    }
}
