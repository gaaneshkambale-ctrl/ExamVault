using Microsoft.Extensions.Logging;
using OnlineExamSystem.Result.Application.Interfaces;
using OnlineExamSystem.Result.Application.Scoring;
using OnlineExamSystem.Result.Domain;

namespace OnlineExamSystem.Result.Application.GetExamReport;

public class GetExamReportHandler
{
    private readonly ISubmissionLookupClient _submissionLookupClient;
    private readonly IQuestionAnswerKeyClient _questionAnswerKeyClient;
    private readonly IExamLookupClient _examLookupClient;
    private readonly ILogger<GetExamReportHandler> _logger;

    public GetExamReportHandler(
        ISubmissionLookupClient submissionLookupClient,
        IQuestionAnswerKeyClient questionAnswerKeyClient,
        IExamLookupClient examLookupClient,
        ILogger<GetExamReportHandler> logger)
    {
        _submissionLookupClient = submissionLookupClient;
        _questionAnswerKeyClient = questionAnswerKeyClient;
        _examLookupClient = examLookupClient;
        _logger = logger;
    }

    public async Task<GetExamReportResult> HandleAsync(
        GetExamReportQuery query,
        CancellationToken cancellationToken = default)
    {
        // Same try/catch-to-ProviderFailure shape as GetResultHandler - every
        // branch below calls another service, so an unreachable one should
        // come back as a clean 502, not an unhandled 500.
        try
        {
            var exam = await _examLookupClient.GetExamAsync(query.ExamId, query.BearerToken, cancellationToken);
            if (exam is null)
            {
                return GetExamReportResult.ExamNotFound();
            }

            var attempts = await _submissionLookupClient.GetAttemptsByExamAsync(
                query.ExamId,
                query.BearerToken,
                cancellationToken);

            var answerKey = await _questionAnswerKeyClient.GetAnswerKeyAsync(
                query.ExamId,
                query.BearerToken,
                cancellationToken);

            var attemptResults = attempts.Select(attempt =>
            {
                var selectedOptionByQuestionId = attempt.Answers.ToDictionary(a => a.QuestionId, a => a.SelectedOptionId);
                var (totalScore, questionResults) = AttemptScorer.Score(answerKey, selectedOptionByQuestionId);

                return new AdminAttemptResult
                {
                    AttemptId = attempt.AttemptId,
                    UserId = attempt.UserId,
                    TotalScore = totalScore,
                    Passed = totalScore >= exam.PassingMarks,
                    SubmittedAtUtc = attempt.SubmittedAtUtc ?? DateTime.UtcNow,
                    Questions = questionResults,
                    FullscreenExitCount = attempt.FullscreenExitCount,
                };
            }).ToList();

            return GetExamReportResult.Ok(new AdminExamReport
            {
                ExamId = exam.Id,
                ExamTitle = exam.Title,
                TotalMarks = exam.TotalMarks,
                PassingMarks = exam.PassingMarks,
                Attempts = attemptResults,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exam report computation failed for exam {ExamId}.", query.ExamId);
            return GetExamReportResult.ProviderFailure(ex.Message);
        }
    }
}
