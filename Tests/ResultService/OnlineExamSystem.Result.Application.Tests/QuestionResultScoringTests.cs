using OnlineExamSystem.Result.Application.Scoring;
using OnlineExamSystem.Result.Domain;
using Xunit;

namespace OnlineExamSystem.Result.Application.Tests;

public class QuestionResultScoringTests
{
    private static QuestionResult Mcq(bool isCorrect, Guid? selectedOptionId) =>
        new()
        {
            QuestionId = Guid.NewGuid(),
            QuestionType = "MultipleChoice",
            Marks = 1,
            MarksAwarded = isCorrect ? 1 : 0,
            SelectedOptionId = selectedOptionId,
            IsCorrect = isCorrect,
        };

    private static QuestionResult Skipped() => Mcq(isCorrect: false, selectedOptionId: null);

    private static QuestionResult CodeQuestion(int marks, decimal marksAwarded, bool isPendingGrading = false) =>
        new()
        {
            QuestionId = Guid.NewGuid(),
            QuestionType = "CodeProgram",
            Marks = marks,
            MarksAwarded = marksAwarded,
            IsCorrect = false, // AttemptScorer always hardcodes this false for CodeProgram.
            IsPendingGrading = isPendingGrading,
            AnswerText = "some code",
        };

    [Fact]
    public void Summarize_counts_correct_incorrect_and_skipped_separately()
    {
        var questions = new[]
        {
            Mcq(isCorrect: true, selectedOptionId: Guid.NewGuid()),
            Mcq(isCorrect: false, selectedOptionId: Guid.NewGuid()),
            Skipped(),
        };

        var summary = QuestionResultScoring.Summarize(questions);

        Assert.Equal(1, summary.CorrectCount);
        Assert.Equal(1, summary.IncorrectCount);
        Assert.Equal(1, summary.SkippedCount);
        // Accuracy excludes skipped from the denominator: 1 correct / 2 attempted = 50%.
        Assert.Equal(50.0, summary.Accuracy);
    }

    [Fact]
    public void Fully_graded_code_question_counts_as_correct_despite_IsCorrect_false()
    {
        var questions = new[] { CodeQuestion(marks: 5, marksAwarded: 5) };

        var summary = QuestionResultScoring.Summarize(questions);

        Assert.Equal(1, summary.CorrectCount);
        Assert.Equal(0, summary.IncorrectCount);
    }

    [Fact]
    public void Partially_graded_code_question_counts_as_incorrect()
    {
        var questions = new[] { CodeQuestion(marks: 5, marksAwarded: 3) };

        var summary = QuestionResultScoring.Summarize(questions);

        Assert.Equal(0, summary.CorrectCount);
        Assert.Equal(1, summary.IncorrectCount);
    }

    [Fact]
    public void Pending_grading_code_question_never_counts_as_correct()
    {
        var questions = new[] { CodeQuestion(marks: 5, marksAwarded: 5, isPendingGrading: true) };

        var summary = QuestionResultScoring.Summarize(questions);

        Assert.Equal(0, summary.CorrectCount);
        Assert.Equal(1, summary.IncorrectCount);
    }

    [Fact]
    public void Accuracy_is_zero_when_every_question_is_skipped()
    {
        var questions = new[] { Skipped(), Skipped() };

        var summary = QuestionResultScoring.Summarize(questions);

        Assert.Equal(0, summary.CorrectCount);
        Assert.Equal(0, summary.IncorrectCount);
        Assert.Equal(2, summary.SkippedCount);
        Assert.Equal(0.0, summary.Accuracy);
    }
}
