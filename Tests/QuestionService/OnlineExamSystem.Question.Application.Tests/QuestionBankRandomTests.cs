using OnlineExamSystem.Question.Application.QuestionBank;
using OnlineExamSystem.Question.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

// Random draw into an exam + the per-question negative-marks copy rule.
public partial class QuestionBankServiceTests
{
    private async Task SeedAsync(Guid subjectId, int count, string difficulty = "Medium", Guid? topicId = null, string status = "Active")
    {
        for (var i = 0; i < count; i++)
        {
            var result = await _service.CreateQuestionAsync(
                Command(subjectId, topicId) with { Difficulty = difficulty, Status = status, QuestionText = $"{difficulty} #{i} {Guid.NewGuid():N}" },
                Teacher,
                default);
            Assert.Equal(BankOutcome.Ok, result.Outcome);
        }
    }

    private static RandomDrawRule Rule(Guid subjectId, int count, QuestionDifficulty? difficulty = null, Guid? topicId = null, QuestionType? type = null) =>
        new(subjectId, topicId, type, difficulty, count);

    [Fact]
    public async Task Random_draw_copies_exactly_the_requested_number_of_distinct_questions()
    {
        var subject = await SubjectAsync();
        await SeedAsync(subject.Id, 12);
        var examId = Guid.NewGuid();

        var result = await _service.AddRandomToExamAsync(examId, null, [Rule(subject.Id, 5)], Admin.UserId, default);

        Assert.Equal(5, result.Value!.Added);
        Assert.Equal(5, _repo.ExamCopies.Count);
        Assert.Equal(5, _repo.ExamCopies.Select(c => c.SourceBankQuestionId).Distinct().Count());
        Assert.All(_repo.ExamCopies, c => Assert.Equal(examId, c.ExamId));
    }

    [Fact]
    public async Task Random_draw_only_picks_matching_difficulty_and_topic()
    {
        var subject = await SubjectAsync();
        var topic = (await _service.CreateTopicAsync(subject.Id, "Normalization", Admin.UserId, default)).Value!;
        await SeedAsync(subject.Id, 4, "Easy", topic.Id);
        await SeedAsync(subject.Id, 4, "Hard", topic.Id);
        await SeedAsync(subject.Id, 4, "Easy", null);

        await _service.AddRandomToExamAsync(Guid.NewGuid(), null, [Rule(subject.Id, 3, QuestionDifficulty.Easy, topic.Id)], Admin.UserId, default);

        Assert.Equal(3, _repo.ExamCopies.Count);
        Assert.All(_repo.ExamCopies, c => Assert.Equal(QuestionDifficulty.Easy, c.Difficulty));
        var bankIds = _repo.ExamCopies.Select(c => c.SourceBankQuestionId!.Value).ToHashSet();
        var inTopic = (await _service.ListQuestionsAsync(new(null, subject.Id, topic.Id, null, null, null, null, null, 1, 100), default)).Items
            .Select(i => i.Question.Id).ToHashSet();
        Assert.True(bankIds.IsSubsetOf(inTopic));
    }

    [Fact]
    public async Task Random_draw_ignores_draft_and_archived_questions()
    {
        var subject = await SubjectAsync();
        await SeedAsync(subject.Id, 3, status: "Active");
        await SeedAsync(subject.Id, 5, status: "Draft");
        await SeedAsync(subject.Id, 5, status: "Archived");

        var tooMany = await _service.AddRandomToExamAsync(Guid.NewGuid(), null, [Rule(subject.Id, 4)], Admin.UserId, default);
        var exact = await _service.AddRandomToExamAsync(Guid.NewGuid(), null, [Rule(subject.Id, 3)], Admin.UserId, default);

        Assert.Equal(BankOutcome.Invalid, tooMany.Outcome);
        Assert.Equal(3, exact.Value!.Added);
    }

    [Fact]
    public async Task Random_draw_never_re_picks_a_question_already_in_the_exam()
    {
        var subject = await SubjectAsync();
        await SeedAsync(subject.Id, 6);
        var examId = Guid.NewGuid();

        await _service.AddRandomToExamAsync(examId, null, [Rule(subject.Id, 4)], Admin.UserId, default);
        var second = await _service.AddRandomToExamAsync(examId, null, [Rule(subject.Id, 2)], Admin.UserId, default);
        var third = await _service.AddRandomToExamAsync(examId, null, [Rule(subject.Id, 1)], Admin.UserId, default);

        Assert.Equal(2, second.Value!.Added);
        Assert.Equal(BankOutcome.Invalid, third.Outcome);
        Assert.Equal(6, _repo.ExamCopies.Select(c => c.SourceBankQuestionId).Distinct().Count());
    }

    [Fact]
    public async Task A_short_rule_fails_the_whole_draw_and_adds_nothing()
    {
        var subject = await SubjectAsync();
        await SeedAsync(subject.Id, 5, "Medium");
        await SeedAsync(subject.Id, 1, "Hard");

        var result = await _service.AddRandomToExamAsync(
            Guid.NewGuid(), null,
            [Rule(subject.Id, 3, QuestionDifficulty.Medium), Rule(subject.Id, 2, QuestionDifficulty.Hard)],
            Admin.UserId, default);

        Assert.Equal(BankOutcome.Invalid, result.Outcome);
        Assert.Contains(result.Errors!, e => e.Contains("Rule 2") && e.Contains("only 1"));
        Assert.DoesNotContain(result.Errors!, e => e.Contains("Rule 1"));
        Assert.Empty(_repo.ExamCopies);
    }

    [Fact]
    public async Task Overlapping_rules_never_hand_out_the_same_question_twice()
    {
        var subject = await SubjectAsync();
        await SeedAsync(subject.Id, 4, "Medium");

        var overlapping = await _service.AddRandomToExamAsync(
            Guid.NewGuid(), null, [Rule(subject.Id, 3), Rule(subject.Id, 3, QuestionDifficulty.Medium)], Admin.UserId, default);
        var fitting = await _service.AddRandomToExamAsync(
            Guid.NewGuid(), null, [Rule(subject.Id, 2), Rule(subject.Id, 2, QuestionDifficulty.Medium)], Admin.UserId, default);

        Assert.Equal(BankOutcome.Invalid, overlapping.Outcome);
        Assert.Equal(4, fitting.Value!.Added);
        Assert.Equal(4, _repo.ExamCopies.Select(c => c.SourceBankQuestionId).Distinct().Count());
    }

    [Fact]
    public async Task Random_draw_can_target_a_section_and_mixes_with_hand_picked_questions()
    {
        var subject = await SubjectAsync();
        await SeedAsync(subject.Id, 5);
        var examId = Guid.NewGuid();
        var sectionId = Guid.NewGuid();
        var handPicked = (await _service.ListQuestionsAsync(new(null, subject.Id, null, null, null, null, null, null, 1, 100), default)).Items[0].Question;
        await _service.AddToExamAsync(examId, sectionId, [handPicked.Id], Admin.UserId, default);

        var result = await _service.AddRandomToExamAsync(examId, sectionId, [Rule(subject.Id, 4)], Admin.UserId, default);

        Assert.Equal(4, result.Value!.Added);
        Assert.Equal(5, _repo.ExamCopies.Count);
        Assert.All(_repo.ExamCopies, c => Assert.Equal(sectionId, c.SectionId));
        Assert.Equal(5, _repo.ExamCopies.Select(c => c.SourceBankQuestionId).Distinct().Count());
    }

    [Fact]
    public async Task Random_draw_validates_its_input()
    {
        var subject = await SubjectAsync();
        var exam = Guid.NewGuid();

        Assert.Equal(BankOutcome.Invalid, (await _service.AddRandomToExamAsync(exam, null, [], Admin.UserId, default)).Outcome);
        Assert.Equal(BankOutcome.Invalid, (await _service.AddRandomToExamAsync(Guid.Empty, null, [Rule(subject.Id, 1)], Admin.UserId, default)).Outcome);
        Assert.Equal(BankOutcome.Invalid, (await _service.AddRandomToExamAsync(exam, null, [Rule(subject.Id, 0)], Admin.UserId, default)).Outcome);
        Assert.Equal(BankOutcome.Invalid, (await _service.AddRandomToExamAsync(exam, null, [Rule(Guid.Empty, 1)], Admin.UserId, default)).Outcome);
        Assert.Equal(BankOutcome.Invalid, (await _service.AddRandomToExamAsync(exam, null, [Rule(subject.Id, QuestionBankService.MaxAddToExamBatch + 1)], Admin.UserId, default)).Outcome);
        var manyRules = Enumerable.Range(0, QuestionBankService.MaxRandomRules + 1).Select(_ => Rule(subject.Id, 1)).ToList();
        Assert.Equal(BankOutcome.Invalid, (await _service.AddRandomToExamAsync(exam, null, manyRules, Admin.UserId, default)).Outcome);
        Assert.Equal(BankOutcome.Invalid, (await _service.AddRandomToExamAsync(exam, null, [Rule(Guid.NewGuid(), 1)], Admin.UserId, default)).Outcome);
    }

    [Fact]
    public async Task Preview_reports_how_many_each_rule_could_draw_without_adding_anything()
    {
        var subject = await SubjectAsync();
        await SeedAsync(subject.Id, 5, "Easy");
        await SeedAsync(subject.Id, 2, "Hard");

        var preview = (await _service.PreviewRandomAsync(
            Guid.NewGuid(),
            [Rule(subject.Id, 3, QuestionDifficulty.Easy), Rule(subject.Id, 4, QuestionDifficulty.Hard), Rule(subject.Id, 1)],
            default)).Value!;

        Assert.Equal([(3, 5), (4, 2), (1, 7)], preview.Select(p => (p.Requested, p.Available)));
        Assert.Empty(_repo.ExamCopies);
    }

    [Fact]
    public async Task Preview_excludes_questions_already_in_the_exam()
    {
        var subject = await SubjectAsync();
        await SeedAsync(subject.Id, 4);
        var examId = Guid.NewGuid();
        await _service.AddRandomToExamAsync(examId, null, [Rule(subject.Id, 3)], Admin.UserId, default);

        var preview = (await _service.PreviewRandomAsync(examId, [Rule(subject.Id, 1)], default)).Value!;

        Assert.Equal(1, preview[0].Available);
    }

    [Theory]
    [InlineData(0.5, 0.5)]
    [InlineData(0.25, 0.25)]
    [InlineData(0, null)]
    public async Task Exam_copy_carries_negative_marks_only_when_above_zero(double bankNegative, double? expected)
    {
        var subject = await SubjectAsync();
        var bank = (await _service.CreateQuestionAsync(
            Command(subject.Id, marks: 2, negative: (decimal)bankNegative) with { Status = "Active" }, Teacher, default)).Value!.Question;

        await _service.AddToExamAsync(Guid.NewGuid(), null, [bank.Id], Admin.UserId, default);

        Assert.Equal(expected is null ? null : (decimal)expected, Assert.Single(_repo.ExamCopies).NegativeMarks);
    }
}
