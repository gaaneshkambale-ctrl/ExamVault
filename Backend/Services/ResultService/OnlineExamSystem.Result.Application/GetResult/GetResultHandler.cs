using OnlineExamSystem.Result.Application.Interfaces;
using OnlineExamSystem.Result.Domain;

namespace OnlineExamSystem.Result.Application.GetResult;

public class GetResultHandler
{
    private readonly ISubmissionLookupClient _submissionLookupClient;
    private readonly IQuestionAnswerKeyClient _questionAnswerKeyClient;
    private readonly IExamLookupClient _examLookupClient;

    public GetResultHandler(
        ISubmissionLookupClient submissionLookupClient,
        IQuestionAnswerKeyClient questionAnswerKeyClient,
        IExamLookupClient examLookupClient)
    {
        _submissionLookupClient = submissionLookupClient;
        _questionAnswerKeyClient = questionAnswerKeyClient;
        _examLookupClient = examLookupClient;
    }

    public async Task<GetResultResult> HandleAsync(GetResultQuery query, CancellationToken cancellationToken = default)
    {
        var attempt = await _submissionLookupClient.GetMyAttemptAsync(
            query.ExamId,
            query.BearerToken,
            cancellationToken);

        if (attempt is null || attempt.Status is not ("Submitted" or "AutoSubmitted"))
        {
            return GetResultResult.NotSubmitted();
        }

        var exam = await _examLookupClient.GetExamAsync(query.ExamId, query.BearerToken, cancellationToken);
        if (exam is null)
        {
            return GetResultResult.ExamNotFound();
        }

        var answerKey = await _questionAnswerKeyClient.GetAnswerKeyAsync(
            query.ExamId,
            query.BearerToken,
            cancellationToken);
        var answerKeyByQuestionId = answerKey.ToDictionary(q => q.QuestionId);
        var selectedOptionByQuestionId = attempt.Answers.ToDictionary(a => a.QuestionId, a => a.SelectedOptionId);

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

        var showCorrectAnswers = await _examLookupClient.GetShowCorrectAnswersAsync(
            query.ExamId,
            query.BearerToken,
            cancellationToken);

        var summary = new ExamResultSummary
        {
            AttemptId = attempt.AttemptId,
            ExamId = query.ExamId,
            ExamTitle = exam.Title,
            TotalScore = totalScore,
            TotalMarks = exam.TotalMarks,
            PassingMarks = exam.PassingMarks,
            Passed = totalScore >= exam.PassingMarks,
            SubmittedAtUtc = attempt.SubmittedAtUtc ?? DateTime.UtcNow,
            Questions = showCorrectAnswers ? questionResults : null,
        };

        return GetResultResult.Ok(summary);
    }
}
