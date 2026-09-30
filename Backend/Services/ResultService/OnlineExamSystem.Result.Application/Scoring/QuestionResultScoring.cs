using OnlineExamSystem.Result.Domain;

namespace OnlineExamSystem.Result.Application.Scoring;

public record AttemptQuestionSummary(int CorrectCount, int IncorrectCount, int SkippedCount, double Accuracy);

/// <summary>Correct/Incorrect/Skipped/Accuracy tallies for a scored attempt -
/// mirrors isSkipped/isQuestionCorrect in
/// Frontend/.../utils/generateResultPdf.ts exactly, so the numbers shown on
/// the Admin exam report and the student's own result agree with the
/// question-by-question breakdown already drawn there.</summary>
public static class QuestionResultScoring
{
    public static bool IsSkipped(QuestionResult question) =>
        question.SelectedOptionId is null &&
        (question.SelectedOptionIds is null || question.SelectedOptionIds.Count == 0) &&
        string.IsNullOrEmpty(question.AnswerText);

    // AttemptScorer hardcodes IsCorrect = false for every CodeProgram question
    // (no auto-scoring engine - an admin assigns MarksAwarded by hand), so a
    // fully-credited code/SQL answer would otherwise always count as
    // "incorrect" here. IsCorrect stays authoritative for MCQ/MultiSelect,
    // where the backend does compute it properly.
    public static bool IsEffectivelyCorrect(QuestionResult question) =>
        question.QuestionType == "CodeProgram"
            ? !question.IsPendingGrading && question.Marks > 0 && question.MarksAwarded >= question.Marks
            : question.IsCorrect;

    public static AttemptQuestionSummary Summarize(IReadOnlyList<QuestionResult> questions)
    {
        var correct = 0;
        var incorrect = 0;
        var skipped = 0;
        foreach (var question in questions)
        {
            if (IsSkipped(question))
            {
                skipped++;
            }
            else if (IsEffectivelyCorrect(question))
            {
                correct++;
            }
            else
            {
                incorrect++;
            }
        }

        var attempted = correct + incorrect;
        var accuracy = attempted > 0 ? Math.Round(100.0 * correct / attempted, 2) : 0.0;
        return new AttemptQuestionSummary(correct, incorrect, skipped, accuracy);
    }
}
