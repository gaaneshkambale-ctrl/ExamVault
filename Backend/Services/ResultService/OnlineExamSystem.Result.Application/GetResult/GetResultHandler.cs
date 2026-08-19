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
    private readonly ILogger<GetResultHandler> _logger;

    public GetResultHandler(
        ISubmissionLookupClient submissionLookupClient,
        IQuestionAnswerKeyClient questionAnswerKeyClient,
        IExamLookupClient examLookupClient,
        ILogger<GetResultHandler> logger)
    {
        _submissionLookupClient = submissionLookupClient;
        _questionAnswerKeyClient = questionAnswerKeyClient;
        _examLookupClient = examLookupClient;
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
            var selectedOptionByQuestionId = attempt.Answers.ToDictionary(a => a.QuestionId, a => a.SelectedOptionId);

            var (totalScore, questionResults) = AttemptScorer.Score(answerKey, selectedOptionByQuestionId);

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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Result computation failed for exam {ExamId}.", query.ExamId);
            return GetResultResult.ProviderFailure(ex.Message);
        }
    }
}
