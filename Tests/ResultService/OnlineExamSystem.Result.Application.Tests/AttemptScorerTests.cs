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

    private static AnswerKeyQuestion CodeQuestion(int marks = 5) =>
        new(QuestionId, "Write a function", marks, null, [], "CodeProgram");

    private static readonly IReadOnlyDictionary<Guid, SectionLookupResult> NoSections =
        new Dictionary<Guid, SectionLookupResult>();

    private static IReadOnlyDictionary<Guid, SubmissionAnswer> Answers(params SubmissionAnswer[] answers) =>
        answers.ToDictionary(a => a.QuestionId);

    private static readonly IReadOnlyDictionary<Guid, SubmissionAnswer> NoAnswers =
        new Dictionary<Guid, SubmissionAnswer>();

    [Fact]
    public void Correct_answer_awards_full_marks()
    {
        var (totalScore, questions, hasPendingGrading) = AttemptScorer.Score(
            [Question(sectionId: null, marks: 2)],
            Answers(new SubmissionAnswer(QuestionId, CorrectOptionId)),
            NoSections,
            examNegativeMarkingEnabled: false,
            examNegativeMarks: 0);

        Assert.Equal(2, totalScore);
        Assert.Equal(2, questions[0].MarksAwarded);
        Assert.True(questions[0].IsCorrect);
        Assert.False(hasPendingGrading);
    }

    [Fact]
    public void Unanswered_question_scores_zero_even_with_negative_marking_enabled()
    {
        var (totalScore, questions, _) = AttemptScorer.Score(
            [Question(sectionId: null)],
            NoAnswers,
            NoSections,
            examNegativeMarkingEnabled: true,
            examNegativeMarks: 0.5m);

        Assert.Equal(0, totalScore);
        Assert.Equal(0, questions[0].MarksAwarded);
    }

    [Fact]
    public void Wrong_answer_with_negative_marking_disabled_scores_zero()
    {
        var (totalScore, questions, _) = AttemptScorer.Score(
            [Question(sectionId: null)],
            Answers(new SubmissionAnswer(QuestionId, WrongOptionId)),
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

        var (totalScore, questions, _) = AttemptScorer.Score(
            [Question(sectionId: SectionId)],
            Answers(new SubmissionAnswer(QuestionId, WrongOptionId)),
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
        var (totalScore, questions, _) = AttemptScorer.Score(
            [Question(sectionId: null)],
            Answers(new SubmissionAnswer(QuestionId, WrongOptionId)),
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
        var selected = Answers(
            new SubmissionAnswer(q1, WrongOptionId),
            new SubmissionAnswer(q2, wrong2));

        var (totalScore, _, _) = AttemptScorer.Score(
            answerKey,
            selected,
            NoSections,
            examNegativeMarkingEnabled: true,
            examNegativeMarks: 5m);

        Assert.Equal(0, totalScore);
    }

    [Fact]
    public void Graded_code_answer_awards_admin_assigned_marks()
    {
        var (totalScore, questions, hasPendingGrading) = AttemptScorer.Score(
            [CodeQuestion(marks: 10)],
            Answers(new SubmissionAnswer(QuestionId, null, "print('hi')", MarksAwarded: 7)),
            NoSections,
            examNegativeMarkingEnabled: false,
            examNegativeMarks: 0);

        Assert.Equal(7, totalScore);
        Assert.Equal(7, questions[0].MarksAwarded);
        Assert.Equal("print('hi')", questions[0].AnswerText);
        Assert.False(hasPendingGrading);
    }

    [Fact]
    public void Ungraded_code_answer_contributes_zero_and_flags_pending_grading()
    {
        var (totalScore, questions, hasPendingGrading) = AttemptScorer.Score(
            [CodeQuestion(marks: 10)],
            Answers(new SubmissionAnswer(QuestionId, null, "print('hi')")),
            NoSections,
            examNegativeMarkingEnabled: false,
            examNegativeMarks: 0);

        Assert.Equal(0, totalScore);
        Assert.Equal(0, questions[0].MarksAwarded);
        Assert.True(hasPendingGrading);
        Assert.True(questions[0].IsPendingGrading);
    }

    [Fact]
    public void Unanswered_code_question_scores_zero_without_flagging_pending_grading()
    {
        var (totalScore, questions, hasPendingGrading) = AttemptScorer.Score(
            [CodeQuestion(marks: 10)],
            NoAnswers,
            NoSections,
            examNegativeMarkingEnabled: false,
            examNegativeMarks: 0);

        Assert.Equal(0, totalScore);
        Assert.Equal(0, questions[0].MarksAwarded);
        Assert.False(hasPendingGrading);
        Assert.False(questions[0].IsPendingGrading);
    }
}
