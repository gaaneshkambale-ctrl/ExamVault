using OnlineExamSystem.Result.Application.Interfaces;
using OnlineExamSystem.Result.Domain;

namespace OnlineExamSystem.Result.Application.Scoring;

public static class AttemptScorer
{
    public static (decimal TotalScore, List<QuestionResult> Questions) Score(
        IReadOnlyList<AnswerKeyQuestion> answerKey,
        IReadOnlyDictionary<Guid, Guid?> selectedOptionByQuestionId,
        IReadOnlyDictionary<Guid, SectionLookupResult> sectionsById,
        bool examNegativeMarkingEnabled,
        decimal examNegativeMarks)
    {
        var totalScore = 0m;
        var questionResults = new List<QuestionResult>();
        foreach (var question in answerKey)
        {
            var correctOptionId = question.Options.FirstOrDefault(o => o.IsCorrect)?.OptionId;
            selectedOptionByQuestionId.TryGetValue(question.QuestionId, out var selectedOptionId);
            var isAnswered = selectedOptionId is not null;
            var isCorrect = isAnswered && selectedOptionId == correctOptionId;

            // Wrong answers lose marks per whichever negative-marking config governs this
            // question - its own section's, or the exam's own when it has no section.
            // Unanswered questions are never penalized either way.
            decimal marksAwarded;
            if (isCorrect)
            {
                marksAwarded = question.Marks;
            }
            else if (isAnswered)
            {
                var (negativeMarkingEnabled, negativeMarks) =
                    question.SectionId is { } sectionId && sectionsById.TryGetValue(sectionId, out var section)
                        ? (section.NegativeMarkingEnabled, section.NegativeMarks)
                        : (examNegativeMarkingEnabled, examNegativeMarks);
                marksAwarded = negativeMarkingEnabled ? -negativeMarks : 0;
            }
            else
            {
                marksAwarded = 0;
            }

            totalScore += marksAwarded;

            questionResults.Add(new QuestionResult
            {
                QuestionId = question.QuestionId,
                QuestionText = question.QuestionText,
                Marks = question.Marks,
                MarksAwarded = marksAwarded,
                SelectedOptionId = selectedOptionId,
                IsCorrect = isCorrect,
                Options = question.Options
                    .Select(o => new QuestionResultOption
                    {
                        OptionId = o.OptionId,
                        OptionText = o.OptionText,
                        IsCorrect = o.IsCorrect,
                    })
                    .ToList(),
            });
        }

        // A student's total never drops below zero, even if negative marking would
        // otherwise take it there - standard exam convention.
        return (Math.Max(0, totalScore), questionResults);
    }
}
