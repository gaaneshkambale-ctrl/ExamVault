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

            var sections = await _examLookupClient.GetSectionsAsync(query.ExamId, query.BearerToken, cancellationToken);
            var sectionsById = sections.ToDictionary(s => s.Id);

            var scoredAttempts = attempts.Select(attempt =>
            {
                var answersByQuestionId = attempt.Answers.ToDictionary(a => a.QuestionId);
                var (totalScore, questionResults, hasPendingGrading) = AttemptScorer.Score(
                    answerKey,
                    answersByQuestionId,
                    sectionsById,
                    exam.NegativeMarkingEnabled,
                    exam.NegativeMarks);
                return (attempt, totalScore, questionResults, hasPendingGrading, summary: QuestionResultScoring.Summarize(questionResults));
            }).ToList();

            // Rank/Percentile only attach to each user's own LATEST attempt
            // (the explicit product decision - see ExamRankingCalculator) -
            // an older, superseded attempt from the same student stays
            // unranked rather than showing a stale standing.
            var rankings = ExamRankingCalculator.Compute(
                scoredAttempts
                    .Select(s => new RankableAttempt(s.attempt.AttemptId, s.attempt.UserId, s.attempt.SubmittedAtUtc ?? DateTime.UtcNow, s.totalScore))
                    .ToList());

            var attemptResults = scoredAttempts.Select(s =>
            {
                rankings.TryGetValue(s.attempt.AttemptId, out var ranking);
                return new AdminAttemptResult
                {
                    AttemptId = s.attempt.AttemptId,
                    UserId = s.attempt.UserId,
                    TotalScore = s.totalScore,
                    Passed = s.totalScore >= exam.PassingMarks,
                    SubmittedAtUtc = s.attempt.SubmittedAtUtc ?? DateTime.UtcNow,
                    Questions = s.questionResults,
                    HasPendingGrading = s.hasPendingGrading,
                    FullscreenExitCount = s.attempt.FullscreenExitCount,
                    NoFaceDetectedCount = s.attempt.NoFaceDetectedCount,
                    MultipleFacesDetectedCount = s.attempt.MultipleFacesDetectedCount,
                    TabSwitchCount = s.attempt.TabSwitchCount,
                    MultipleTabsCount = s.attempt.MultipleTabsCount,
                    CopyPasteCount = s.attempt.CopyPasteCount,
                    RightClickCount = s.attempt.RightClickCount,
                    MultipleMonitorsCount = s.attempt.MultipleMonitorsCount,
                    CorrectCount = s.summary.CorrectCount,
                    IncorrectCount = s.summary.IncorrectCount,
                    SkippedCount = s.summary.SkippedCount,
                    Accuracy = s.summary.Accuracy,
                    Rank = ranking?.Rank,
                    Percentile = ranking?.Percentile,
                    TotalParticipants = ranking?.TotalParticipants,
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
