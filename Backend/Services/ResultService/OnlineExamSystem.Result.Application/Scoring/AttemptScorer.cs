using OnlineExamSystem.Result.Application.Interfaces;
using OnlineExamSystem.Result.Domain;

namespace OnlineExamSystem.Result.Application.Scoring;

public static class AttemptScorer
{
    public static (int TotalScore, List<QuestionResult> Questions) Score(
        IReadOnlyList<AnswerKeyQuestion> answerKey,
        IReadOnlyDictionary<Guid, Guid?> selectedOptionByQuestionId)
    {
        var totalScore = 0;
        var questionResults = new List<QuestionResult>();
        foreach (var question in answerKey)
        {
            var correctOptionId = question.Options.FirstOrDefault(o => o.IsCorrect)?.OptionId;
            selectedOptionByQuestionId.TryGetValue(question.QuestionId, out var selectedOptionId);
            var isCorrect = selectedOptionId is not null && selectedOptionId == correctOptionId;
            var marksAwarded = isCorrect ? question.Marks : 0;
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

        return (totalScore, questionResults);
    }
}
