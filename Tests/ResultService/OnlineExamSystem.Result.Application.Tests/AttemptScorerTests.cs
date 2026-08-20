using OnlineExamSystem.Result.Application.Interfaces;
using OnlineExamSystem.Result.Application.Scoring;
using Xunit;

namespace OnlineExamSystem.Result.Application.Tests;

public class AttemptScorerTests
{
    private static readonly Guid QuestionId = Guid.NewGuid();
    private static readonly Guid SectionId = Guid.NewGuid();
    private static readonly Guid CorrectOptionId = Guid.NewGuid();
    private static readonly Guid WrongOptionId = Guid.NewGuid();

    private static AnswerKeyQuestion Question(Guid? sectionId, int marks = 1) =>
        new(
            QuestionId,
            "Question",
            marks,
            sectionId,
            [
                new AnswerKeyOption(CorrectOptionId, "Correct", true),
                new AnswerKeyOption(WrongOptionId, "Wrong", false),
            ]);

    private static readonly IReadOnlyDictionary<Guid, SectionLookupResult> NoSections =
        new Dictionary<Guid, SectionLookupResult>();

    [Fact]
    public void Correct_answer_awards_full_marks()
    {
        var (totalScore, questions) = AttemptScorer.Score(
            [Question(sectionId: null, marks: 2)],
            new Dictionary<Guid, Guid?> { [QuestionId] = CorrectOptionId },
            NoSections,
            examNegativeMarkingEnabled: false,
            examNegativeMarks: 0);

        Assert.Equal(2, totalScore);
        Assert.Equal(2, questions[0].MarksAwarded);
        Assert.True(questions[0].IsCorrect);
    }

    [Fact]
    public void Unanswered_question_scores_zero_even_with_negative_marking_enabled()
    {
        var (totalScore, questions) = AttemptScorer.Score(
            [Question(sectionId: null)],
            new Dictionary<Guid, Guid?>(),
            NoSections,
            examNegativeMarkingEnabled: true,
            examNegativeMarks: 0.5m);

        Assert.Equal(0, totalScore);
        Assert.Equal(0, questions[0].MarksAwarded);
    }

    [Fact]
    public void Wrong_answer_with_negative_marking_disabled_scores_zero()
    {
        var (totalScore, questions) = AttemptScorer.Score(
            [Question(sectionId: null)],
            new Dictionary<Guid, Guid?> { [QuestionId] = WrongOptionId },
            NoSections,
            examNegativeMarkingEnabled: false,
            examNegativeMarks: 0.5m);

        Assert.Equal(0, totalScore);
        Assert.Equal(0, questions[0].MarksAwarded);
    }

    [Fact]
    public void Wrong_answer_in_a_section_uses_the_sections_negative_marks()
    {
        var sections = new Dictionary<Guid, SectionLookupResult>
        {
            [SectionId] = new SectionLookupResult(SectionId, NegativeMarkingEnabled: true, NegativeMarks: 0.25m),
        };

        var (totalScore, questions) = AttemptScorer.Score(
            [Question(sectionId: SectionId)],
            new Dictionary<Guid, Guid?> { [QuestionId] = WrongOptionId },
            sections,
            examNegativeMarkingEnabled: false,
            examNegativeMarks: 5m);

        // Exam-level config is ignored once the question belongs to a section.
        Assert.Equal(0, totalScore);
        Assert.Equal(-0.25m, questions[0].MarksAwarded);
    }

    [Fact]
    public void Wrong_answer_with_no_section_falls_back_to_exam_level_negative_marking()
    {
        var (totalScore, questions) = AttemptScorer.Score(
            [Question(sectionId: null)],
            new Dictionary<Guid, Guid?> { [QuestionId] = WrongOptionId },
            NoSections,
            examNegativeMarkingEnabled: true,
            examNegativeMarks: 0.5m);

        Assert.Equal(0, totalScore);
        Assert.Equal(-0.5m, questions[0].MarksAwarded);
    }

    [Fact]
    public void Total_score_never_drops_below_zero()
    {
        var q1 = QuestionId;
        var q2 = Guid.NewGuid();
        var correct2 = Guid.NewGuid();
        var wrong2 = Guid.NewGuid();

        var answerKey = new List<AnswerKeyQuestion>
        {
            Question(sectionId: null, marks: 1),
            new(q2, "Q2", 1, null, [new AnswerKeyOption(correct2, "Correct", true), new AnswerKeyOption(wrong2, "Wrong", false)]),
        };
        var selected = new Dictionary<Guid, Guid?> { [q1] = WrongOptionId, [q2] = wrong2 };

        var (totalScore, _) = AttemptScorer.Score(
            answerKey,
            selected,
            NoSections,
            examNegativeMarkingEnabled: true,
            examNegativeMarks: 5m);

        Assert.Equal(0, totalScore);
    }
}
