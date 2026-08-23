using OnlineExamSystem.Result.Application.Interfaces;
using OnlineExamSystem.Result.Domain;

namespace OnlineExamSystem.Result.Application.Scoring;

public static class AttemptScorer
{
    public static (decimal TotalScore, List<QuestionResult> Questions, bool HasPendingGrading) Score(
        IReadOnlyList<AnswerKeyQuestion> answerKey,
        IReadOnlyDictionary<Guid, SubmissionAnswer> answersByQuestionId,
        IReadOnlyDictionary<Guid, SectionLookupResult> sectionsById,
        bool examNegativeMarkingEnabled,
        decimal examNegativeMarks)
    {
        var totalScore = 0m;
        var hasPendingGrading = false;
        var questionResults = new List<QuestionResult>();
        foreach (var question in answerKey)
        {
            answersByQuestionId.TryGetValue(question.QuestionId, out var answer);

            if (question.QuestionType == "CodeProgram")
            {
                // No auto-scoring engine exists - an admin assigns MarksAwarded by hand.
                // Null means "not graded yet" (contributes 0, flags the attempt as
                // provisional), not "scored zero".
                var isAnswered = answer?.AnswerText is not null;
                var marksAwarded = answer?.MarksAwarded ?? 0;
                var isPendingGrading = isAnswered && answer!.MarksAwarded is null;
                if (isPendingGrading)
                {
                    hasPendingGrading = true;
                }

                totalScore += marksAwarded;

                questionResults.Add(new QuestionResult
                {
                    QuestionId = question.QuestionId,
                    QuestionText = question.QuestionText,
                    QuestionType = question.QuestionType,
                    Marks = question.Marks,
                    MarksAwarded = marksAwarded,
                    AnswerText = answer?.AnswerText,
                    IsCorrect = false,
                    IsPendingGrading = isPendingGrading,
                    Options = [],
                });
                continue;
            }

            bool isOptionAnswered;
            bool isCorrect;
            Guid? selectedOptionId = null;
            IReadOnlyList<Guid>? selectedOptionIds = null;

            if (question.QuestionType == "MultiSelect")
            {
                // All-or-nothing: the selected set must exactly equal the correct
                // set (no partial credit) - same "wrong answer" treatment as
                // single-option below, just via HashSet.SetEquals instead of a
                // scalar comparison.
                var correctOptionIds = question.Options.Where(o => o.IsCorrect).Select(o => o.OptionId).ToHashSet();
                selectedOptionIds = answer?.SelectedOptionIds;
                isOptionAnswered = selectedOptionIds is { Count: > 0 };
                isCorrect = isOptionAnswered && correctOptionIds.SetEquals(selectedOptionIds!);
            }
            else
            {
                var correctOptionId = question.Options.FirstOrDefault(o => o.IsCorrect)?.OptionId;
                selectedOptionId = answer?.SelectedOptionId;
                isOptionAnswered = selectedOptionId is not null;
                isCorrect = isOptionAnswered && selectedOptionId == correctOptionId;
            }

            // Wrong answers lose marks per whichever negative-marking config governs this
            // question - its own section's, or the exam's own when it has no section.
            // Unanswered questions are never penalized either way.
            decimal optionMarksAwarded;
            if (isCorrect)
            {
                optionMarksAwarded = question.Marks;
            }
            else if (isOptionAnswered)
            {
                var (negativeMarkingEnabled, negativeMarks) =
                    question.SectionId is { } sectionId && sectionsById.TryGetValue(sectionId, out var section)
                        ? (section.NegativeMarkingEnabled, section.NegativeMarks)
                        : (examNegativeMarkingEnabled, examNegativeMarks);
                optionMarksAwarded = negativeMarkingEnabled ? -negativeMarks : 0;
            }
            else
            {
                optionMarksAwarded = 0;
            }

            totalScore += optionMarksAwarded;

            questionResults.Add(new QuestionResult
            {
                QuestionId = question.QuestionId,
                QuestionText = question.QuestionText,
                QuestionType = question.QuestionType,
                Marks = question.Marks,
                MarksAwarded = optionMarksAwarded,
                SelectedOptionId = selectedOptionId,
                SelectedOptionIds = selectedOptionIds,
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
        return (Math.Max(0, totalScore), questionResults, hasPendingGrading);
    }
}
