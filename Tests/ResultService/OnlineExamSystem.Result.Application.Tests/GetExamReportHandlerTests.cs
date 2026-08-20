using Microsoft.Extensions.Logging.Abstractions;
using OnlineExamSystem.Result.Application.GetExamReport;
using OnlineExamSystem.Result.Application.Interfaces;
using OnlineExamSystem.Result.Application.Tests.Fakes;
using Xunit;

namespace OnlineExamSystem.Result.Application.Tests;

public class GetExamReportHandlerTests
{
    private static readonly Guid ExamId = Guid.NewGuid();
    private static readonly Guid UserAId = Guid.NewGuid();
    private static readonly Guid UserBId = Guid.NewGuid();
    private static readonly Guid AttemptAId = Guid.NewGuid();
    private static readonly Guid AttemptBId = Guid.NewGuid();
    private static readonly Guid Question1Id = Guid.NewGuid();
    private static readonly Guid Question2Id = Guid.NewGuid();
    private static readonly Guid Question1CorrectOptionId = Guid.NewGuid();
    private static readonly Guid Question1WrongOptionId = Guid.NewGuid();
    private static readonly Guid Question2CorrectOptionId = Guid.NewGuid();
    private static readonly Guid Question2WrongOptionId = Guid.NewGuid();

    private static GetExamReportHandler CreateHandler(
        IReadOnlyList<SubmissionLookupResult> attempts,
        IReadOnlyList<AnswerKeyQuestion> answerKey,
        ExamLookupResult? exam,
        Exception? submissionLookupException = null) =>
        new(
            new FakeSubmissionLookupClient(attempts, submissionLookupException),
            new FakeQuestionAnswerKeyClient(answerKey),
            new FakeExamLookupClient(exam),
            NullLogger<GetExamReportHandler>.Instance);

    private static IReadOnlyList<AnswerKeyQuestion> DefaultAnswerKey() =>
        [
            new AnswerKeyQuestion(
                Question1Id,
                "Question 1",
                1,
                null,
                [
                    new AnswerKeyOption(Question1CorrectOptionId, "Correct", true),
                    new AnswerKeyOption(Question1WrongOptionId, "Wrong", false),
                ]),
            new AnswerKeyQuestion(
                Question2Id,
                "Question 2",
                1,
                null,
                [
                    new AnswerKeyOption(Question2CorrectOptionId, "Correct", true),
                    new AnswerKeyOption(Question2WrongOptionId, "Wrong", false),
                ]),
        ];

    [Fact]
    public async Task Scores_every_attempt_across_every_user()
    {
        var attempts = new List<SubmissionLookupResult>
        {
            new(
                AttemptAId,
                UserAId,
                ExamId,
                "Submitted",
                DateTime.UtcNow,
                [
                    new SubmissionAnswer(Question1Id, Question1CorrectOptionId),
                    new SubmissionAnswer(Question2Id, Question2CorrectOptionId),
                ],
                0, 0, 0, 0, 0, 0, 0, 0),
            new(
                AttemptBId,
                UserBId,
                ExamId,
                "AutoSubmitted",
                DateTime.UtcNow,
                [
                    new SubmissionAnswer(Question1Id, Question1WrongOptionId),
                    new SubmissionAnswer(Question2Id, Question2CorrectOptionId),
                ],
                0, 0, 0, 0, 0, 0, 0, 0),
        };
        var handler = CreateHandler(attempts, DefaultAnswerKey(), new ExamLookupResult(ExamId, "Test Exam", 2, 1));

        var result = await handler.HandleAsync(new GetExamReportQuery(ExamId, "token"));

        Assert.True(result.Success);
        Assert.Equal(2, result.Report!.Attempts.Count);
        var resultA = result.Report.Attempts.Single(a => a.UserId == UserAId);
        Assert.Equal(2, resultA.TotalScore);
        Assert.True(resultA.Passed);
        var resultB = result.Report.Attempts.Single(a => a.UserId == UserBId);
        Assert.Equal(1, resultB.TotalScore);
        Assert.True(resultB.Passed);
        Assert.Equal(2, resultB.Questions.Count);
    }

    [Fact]
    public async Task Returns_empty_attempts_when_exam_has_no_submissions()
    {
        var handler = CreateHandler([], DefaultAnswerKey(), new ExamLookupResult(ExamId, "Test Exam", 2, 1));

        var result = await handler.HandleAsync(new GetExamReportQuery(ExamId, "token"));

        Assert.True(result.Success);
        Assert.Empty(result.Report!.Attempts);
    }

    [Fact]
    public async Task Exam_not_found_returns_exam_not_found()
    {
        var handler = CreateHandler([], DefaultAnswerKey(), null);

        var result = await handler.HandleAsync(new GetExamReportQuery(ExamId, "token"));

        Assert.True(result.IsExamNotFound);
    }

    [Fact]
    public async Task Downstream_service_failure_returns_clean_provider_failure_result()
    {
        var handler = CreateHandler(
            [],
            DefaultAnswerKey(),
            new ExamLookupResult(ExamId, "Test Exam", 2, 1),
            submissionLookupException: new HttpRequestException("connection refused"));

        var result = await handler.HandleAsync(new GetExamReportQuery(ExamId, "token"));

        Assert.False(result.Success);
        Assert.True(result.IsProviderFailure);
        Assert.NotNull(result.ProviderErrorMessage);
        Assert.Null(result.Report);
    }
}
