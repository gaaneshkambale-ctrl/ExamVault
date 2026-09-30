using Microsoft.Extensions.Logging;
using OnlineExamSystem.Result.Application.Interfaces;
using OnlineExamSystem.Result.Application.Scoring;
using OnlineExamSystem.Result.Domain;

namespace OnlineExamSystem.Result.Application.GetResult;

public class GetResultHandler
{
    private readonly ISubmissionLookupClient _submissionLookupClient;
    private readonly IQuestionAnswerKeyClient _questionAnswerKeyClient;
    private readonly IExamLookupClient _examLookupClient;
    private readonly ISystemTokenProvider _systemTokenProvider;
    private readonly ILogger<GetResultHandler> _logger;

    public GetResultHandler(
        ISubmissionLookupClient submissionLookupClient,
        IQuestionAnswerKeyClient questionAnswerKeyClient,
        IExamLookupClient examLookupClient,
        ISystemTokenProvider systemTokenProvider,
        ILogger<GetResultHandler> logger)
    {
        _submissionLookupClient = submissionLookupClient;
        _questionAnswerKeyClient = questionAnswerKeyClient;
        _examLookupClient = examLookupClient;
        _systemTokenProvider = systemTokenProvider;
        _logger = logger;
    }

    public async Task<GetResultResult> HandleAsync(GetResultQuery query, CancellationToken cancellationToken = default)
    {
        // Every branch below calls out to another service (Submission, Exam,
        // Question) - a network hiccup or an unreachable service should come
        // back as a clean provider-failure result, not an unhandled 500, the
        // same principle AI Service's GenerateQuestionsHandler already uses.
        try
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

            // The admin controls whether a submitted attempt's score is visible to
            // the student yet via the exam's "Show Result to Student" setting - no
            // point scoring the attempt at all if it won't be shown.
            if (!exam.ShowResult)
            {
                return GetResultResult.NotRevealed();
            }

            var answerKey = await _questionAnswerKeyClient.GetAnswerKeyAsync(
                query.ExamId,
                query.BearerToken,
                cancellationToken);
            var answersByQuestionId = attempt.Answers.ToDictionary(a => a.QuestionId);

            var sections = await _examLookupClient.GetSectionsAsync(query.ExamId, query.BearerToken, cancellationToken);
            var sectionsById = sections.ToDictionary(s => s.Id);

            var (totalScore, questionResults, hasPendingGrading) = AttemptScorer.Score(
                answerKey,
                answersByQuestionId,
                sectionsById,
                exam.NegativeMarkingEnabled,
                exam.NegativeMarks);

            var showCorrectAnswers = await _examLookupClient.GetShowCorrectAnswersAsync(
                query.ExamId,
                query.BearerToken,
                cancellationToken);

            var questionSummary = QuestionResultScoring.Summarize(questionResults);

            var (rank, percentile, totalParticipants, averageAccuracy) =
                await TryComputeRankingAsync(query, sectionsById, answerKey, exam, attempt.AttemptId, cancellationToken);

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
                HasPendingGrading = hasPendingGrading,
                CorrectCount = questionSummary.CorrectCount,
                IncorrectCount = questionSummary.IncorrectCount,
                SkippedCount = questionSummary.SkippedCount,
                Accuracy = questionSummary.Accuracy,
                Rank = rank,
                Percentile = percentile,
                TotalParticipants = totalParticipants,
                AverageAccuracy = averageAccuracy,
            };

            return GetResultResult.Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Result computation failed for exam {ExamId}.", query.ExamId);
            return GetResultResult.ProviderFailure(ex.Message);
        }
    }

    // Rank/Percentile require comparing this student's score against every
    // other student's attempt on the same exam - data the student's own
    // bearer token can never fetch (SubmissionService's by-exam endpoint is
    // correctly Admin/Instructor-only). ISystemTokenProvider mints a
    // short-lived, admin-equivalent service token instead, scoped to this
    // exam's own tenant, used ONLY here to compute the numbers below - the
    // raw per-student attempts it fetches are never returned to the caller.
    // Best-effort by design: any failure here (an unreachable
    // SubmissionService, an unexpected auth rejection) must never block a
    // student from seeing their own score, so it degrades to nulls instead
    // of failing the whole result.
    private async Task<(int? Rank, double? Percentile, int? TotalParticipants, double? AverageAccuracy)> TryComputeRankingAsync(
        GetResultQuery query,
        IReadOnlyDictionary<Guid, SectionLookupResult> sectionsById,
        IReadOnlyList<AnswerKeyQuestion> answerKey,
        ExamLookupResult exam,
        Guid myAttemptId,
        CancellationToken cancellationToken)
    {
        try
        {
            var systemToken = _systemTokenProvider.CreateToken(query.TenantId);
            var allAttempts = await _submissionLookupClient.GetAttemptsByExamAsync(query.ExamId, systemToken, cancellationToken);

            var scored = allAttempts
                .Where(a => a.Status is "Submitted" or "AutoSubmitted")
                .Select(a =>
                {
                    var answersByQuestionId = a.Answers.ToDictionary(ans => ans.QuestionId);
                    var (score, questions, _) = AttemptScorer.Score(
                        answerKey, answersByQuestionId, sectionsById, exam.NegativeMarkingEnabled, exam.NegativeMarks);
                    return (attempt: a, score, summary: QuestionResultScoring.Summarize(questions));
                })
                .ToList();

            var rankings = ExamRankingCalculator.Compute(
                scored
                    .Select(s => new RankableAttempt(s.attempt.AttemptId, s.attempt.UserId, s.attempt.SubmittedAtUtc ?? DateTime.UtcNow, s.score))
                    .ToList());

            double? averageAccuracy = scored.Count > 0 ? Math.Round(scored.Average(s => s.summary.Accuracy), 2) : null;

            if (rankings.TryGetValue(myAttemptId, out var mine))
            {
                return (mine.Rank, mine.Percentile, mine.TotalParticipants, averageAccuracy);
            }

            // This attempt isn't the caller's own latest submitted attempt
            // (an older, superseded retake) - no ranking for it, matching
            // the same rule the Admin exam report follows.
            return (null, null, null, averageAccuracy);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Ranking computation failed for exam {ExamId} - continuing without it.", query.ExamId);
            return (null, null, null, null);
        }
    }
}
