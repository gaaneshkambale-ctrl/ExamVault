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

        var totalScore = 0;
        foreach (var answer in attempt.Answers)
        {
            if (!answerKeyByQuestionId.TryGetValue(answer.QuestionId, out var question))
            {
                continue;
            }

            if (answer.SelectedOptionId is not null && answer.SelectedOptionId == question.CorrectOptionId)
            {
                totalScore += question.Marks;
            }
        }

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
        };

        return GetResultResult.Ok(summary);
    }
}
