using OnlineExamSystem.Result.Application.Interfaces;
using OnlineExamSystem.Result.Application.Scoring;
using Xunit;

namespace OnlineExamSystem.Result.Application.Tests;

// A question's own NegativeMarks (copied in from the Question Bank) overrides
// the section/exam negative-marking setting.
public class AttemptScorerQuestionNegativeMarksTests
{
    private static readonly Guid QuestionId = Guid.NewGuid();
    private static readonly Guid SectionId = Guid.NewGuid();
    private static readonly Guid CorrectOptionId = Guid.NewGuid();
    private static readonly Guid WrongOptionId = Guid.NewGuid();

    private static readonly IReadOnlyDictionary<Guid, SectionLookupResult> NoSections =
        new Dictionary<Guid, SectionLookupResult>();

    private static AnswerKeyQuestion Question(decimal? negativeMarks, Guid? sectionId = null, int marks = 2) =>
        new(
            QuestionId,
            "Question",
            marks,
            sectionId,
            [new AnswerKeyOption(CorrectOptionId, "Correct", true), new AnswerKeyOption(WrongOptionId, "Wrong", false)],
            NegativeMarks: negativeMarks);

    private static IReadOnlyDictionary<Guid, SubmissionAnswer> Wrong() =>
        new Dictionary<Guid, SubmissionAnswer> { [QuestionId] = new SubmissionAnswer(QuestionId, WrongOptionId) };

    [Fact]
    public void Own_negative_marks_apply_even_when_the_exam_has_negative_marking_off()
    {
        var (_, questions, _) = AttemptScorer.Score([Question(0.5m)], Wrong(), NoSections, false, 0m);

        Assert.Equal(-0.5m, questions[0].MarksAwarded);
    }

    [Fact]
    public void Own_negative_marks_win_over_a_larger_exam_value()
    {
        var (_, questions, _) = AttemptScorer.Score([Question(0.25m)], Wrong(), NoSections, true, 1m);

        Assert.Equal(-0.25m, questions[0].MarksAwarded);
    }

    [Fact]
    public void Own_negative_marks_win_over_the_section_setting()
    {
        var sections = new Dictionary<Guid, SectionLookupResult>
        {
            [SectionId] = new SectionLookupResult(SectionId, NegativeMarkingEnabled: true, NegativeMarks: 1m),
        };

        var (_, questions, _) = AttemptScorer.Score([Question(0.5m, SectionId)], Wrong(), sections, true, 1m);

        Assert.Equal(-0.5m, questions[0].MarksAwarded);
    }

    [Fact]
    public void A_question_without_its_own_value_still_inherits_the_exam_setting()
    {
        var (_, questions, _) = AttemptScorer.Score([Question(null)], Wrong(), NoSections, true, 0.75m);

        Assert.Equal(-0.75m, questions[0].MarksAwarded);
    }

    [Fact]
    public void Unanswered_question_is_never_penalised_even_with_its_own_negative_marks()
    {
        var (_, questions, _) = AttemptScorer.Score(
            [Question(0.5m)], new Dictionary<Guid, SubmissionAnswer>(), NoSections, true, 1m);

        Assert.Equal(0, questions[0].MarksAwarded);
    }

    [Fact]
    public void Correct_answer_still_earns_full_marks_and_the_penalty_only_hits_wrong_ones()
    {
        var wrongId = Guid.NewGuid();
        var wrongQuestion = new AnswerKeyQuestion(
            wrongId, "Q2", 2, null,
            [new AnswerKeyOption(CorrectOptionId, "Correct", true), new AnswerKeyOption(WrongOptionId, "Wrong", false)],
            NegativeMarks: 0.5m);
        var answers = new Dictionary<Guid, SubmissionAnswer>
        {
            [QuestionId] = new SubmissionAnswer(QuestionId, CorrectOptionId),
            [wrongId] = new SubmissionAnswer(wrongId, WrongOptionId),
        };

        var (total, questions, _) = AttemptScorer.Score([Question(0.5m), wrongQuestion], answers, NoSections, false, 0m);

        Assert.Equal(2m, questions[0].MarksAwarded);
        Assert.Equal(-0.5m, questions[1].MarksAwarded);
        Assert.Equal(1.5m, total);
    }
}
