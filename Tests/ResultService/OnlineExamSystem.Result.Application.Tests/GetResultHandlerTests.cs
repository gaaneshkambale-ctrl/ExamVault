using Microsoft.Extensions.Logging.Abstractions;
using OnlineExamSystem.Result.Application.GetResult;
using OnlineExamSystem.Result.Application.Interfaces;
using OnlineExamSystem.Result.Application.Tests.Fakes;
using Xunit;

namespace OnlineExamSystem.Result.Application.Tests;

public class GetResultHandlerTests
{
    private static readonly Guid ExamId = Guid.NewGuid();
    private static readonly Guid AttemptId = Guid.NewGuid();
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid Question1Id = Guid.NewGuid();
    private static readonly Guid Question2Id = Guid.NewGuid();
    private static readonly Guid Question1CorrectOptionId = Guid.NewGuid();
    private static readonly Guid Question1WrongOptionId = Guid.NewGuid();
    private static readonly Guid Question2CorrectOptionId = Guid.NewGuid();
    private static readonly Guid Question2WrongOptionId = Guid.NewGuid();

    private static GetResultHandler CreateHandler(
        SubmissionLookupResult? submission,
        IReadOnlyList<AnswerKeyQuestion> answerKey,
        ExamLookupResult? exam,
        bool showCorrectAnswers = true,
        Exception? submissionLookupException = null) =>
        new(
            new FakeSubmissionLookupClient(submission, submissionLookupException),
            new FakeQuestionAnswerKeyClient(answerKey),
            new FakeExamLookupClient(exam, showCorrectAnswers),
            NullLogger<GetResultHandler>.Instance);

    private static SubmissionLookupResult Submitted(IReadOnlyList<SubmissionAnswer> answers) =>
        new(AttemptId, UserId, ExamId, "Submitted", DateTime.UtcNow, answers, 0, 0, 0, 0, 0, 0, 0, 0);

    private static IReadOnlyList<AnswerKeyQuestion> DefaultAnswerKey() =>
        [
            new AnswerKeyQuestion(
                Question1Id,
                "Question 1",
                1,
                [
                    new AnswerKeyOption(Question1CorrectOptionId, "Correct", true),
                    new AnswerKeyOption(Question1WrongOptionId, "Wrong", false),
                ]),
            new AnswerKeyQuestion(
                Question2Id,
                "Question 2",
                1,
                [
                    new AnswerKeyOption(Question2CorrectOptionId, "Correct", true),
                    new AnswerKeyOption(Question2WrongOptionId, "Wrong", false),
                ]),
        ];

    [Fact]
    public async Task No_submitted_attempt_returns_not_submitted()
    {
        var handler = CreateHandler(null, DefaultAnswerKey(), new ExamLookupResult(ExamId, "Test", 2, 1));

        var result = await handler.HandleAsync(new GetResultQuery(ExamId, "token"));

        Assert.False(result.Success);
        Assert.True(result.IsNotSubmitted);
    }

    [Fact]
    public async Task InProgress_attempt_returns_not_submitted()
    {
        var submission = new SubmissionLookupResult(AttemptId, UserId, ExamId, "InProgress", null, [], 0, 0, 0, 0, 0, 0, 0, 0);
        var handler = CreateHandler(submission, DefaultAnswerKey(), new ExamLookupResult(ExamId, "Test", 2, 1));

        var result = await handler.HandleAsync(new GetResultQuery(ExamId, "token"));

        Assert.True(result.IsNotSubmitted);
    }

    [Fact]
    public async Task Correct_answers_are_scored_and_wrong_answers_are_not()
    {
        var answers = new List<SubmissionAnswer>
        {
            new(Question1Id, Question1CorrectOptionId),
            new(Question2Id, Question2CorrectOptionId),
        };
        var handler = CreateHandler(
            Submitted(answers),
            DefaultAnswerKey(),
            new ExamLookupResult(ExamId, "Test Exam", 2, 1));

        var result = await handler.HandleAsync(new GetResultQuery(ExamId, "token"));

        Assert.True(result.Success);
        Assert.Equal(2, result.Summary!.TotalScore);
        Assert.Equal(2, result.Summary.TotalMarks);
        Assert.True(result.Summary.Passed);
    }

    [Fact]
    public async Task Wrong_and_unanswered_questions_score_zero()
    {
        var answers = new List<SubmissionAnswer>
        {
            new(Question1Id, Question1WrongOptionId),
            new(Question2Id, null),
        };
        var handler = CreateHandler(
            Submitted(answers),
            DefaultAnswerKey(),
            new ExamLookupResult(ExamId, "Test Exam", 2, 1));

        var result = await handler.HandleAsync(new GetResultQuery(ExamId, "token"));

        Assert.Equal(0, result.Summary!.TotalScore);
        Assert.False(result.Summary.Passed);
    }

    [Fact]
    public async Task Score_exactly_at_passing_marks_counts_as_passed()
    {
        var answers = new List<SubmissionAnswer> { new(Question1Id, Question1CorrectOptionId) };
        var handler = CreateHandler(
            Submitted(answers),
            DefaultAnswerKey(),
            new ExamLookupResult(ExamId, "Test Exam", 2, 1));

        var result = await handler.HandleAsync(new GetResultQuery(ExamId, "token"));

        Assert.Equal(1, result.Summary!.TotalScore);
        Assert.True(result.Summary.Passed);
    }

    [Fact]
    public async Task ShowResult_off_returns_not_revealed_without_scoring()
    {
        var handler = CreateHandler(
            Submitted([new(Question1Id, Question1CorrectOptionId)]),
            DefaultAnswerKey(),
            new ExamLookupResult(ExamId, "Test Exam", 2, 1, ShowResult: false));

        var result = await handler.HandleAsync(new GetResultQuery(ExamId, "token"));

        Assert.False(result.Success);
        Assert.True(result.IsNotRevealed);
        Assert.Null(result.Summary);
    }

    [Fact]
    public async Task Exam_not_found_returns_exam_not_found()
    {
        var handler = CreateHandler(Submitted([]), DefaultAnswerKey(), null);

        var result = await handler.HandleAsync(new GetResultQuery(ExamId, "token"));

        Assert.True(result.IsExamNotFound);
    }

    [Fact]
    public async Task ShowCorrectAnswers_on_includes_per_question_breakdown()
    {
        var answers = new List<SubmissionAnswer>
        {
            new(Question1Id, Question1CorrectOptionId),
            new(Question2Id, Question2WrongOptionId),
        };
        var handler = CreateHandler(
            Submitted(answers),
            DefaultAnswerKey(),
            new ExamLookupResult(ExamId, "Test Exam", 2, 1),
            showCorrectAnswers: true);

        var result = await handler.HandleAsync(new GetResultQuery(ExamId, "token"));

        Assert.NotNull(result.Summary!.Questions);
        Assert.Equal(2, result.Summary.Questions!.Count);
        var q1 = result.Summary.Questions.Single(q => q.QuestionId == Question1Id);
        Assert.True(q1.IsCorrect);
        Assert.Equal(1, q1.MarksAwarded);
        var q2 = result.Summary.Questions.Single(q => q.QuestionId == Question2Id);
        Assert.False(q2.IsCorrect);
        Assert.Equal(0, q2.MarksAwarded);
        Assert.Equal(Question2WrongOptionId, q2.SelectedOptionId);
        // The total score is unaffected by whether the breakdown is shown.
        Assert.Equal(1, result.Summary.TotalScore);
    }

    [Fact]
    public async Task ShowCorrectAnswers_off_omits_per_question_breakdown_but_keeps_score()
    {
        var answers = new List<SubmissionAnswer>
        {
            new(Question1Id, Question1CorrectOptionId),
            new(Question2Id, Question2WrongOptionId),
        };
        var handler = CreateHandler(
            Submitted(answers),
            DefaultAnswerKey(),
            new ExamLookupResult(ExamId, "Test Exam", 2, 1),
            showCorrectAnswers: false);

        var result = await handler.HandleAsync(new GetResultQuery(ExamId, "token"));

        Assert.Null(result.Summary!.Questions);
        Assert.Equal(1, result.Summary.TotalScore);
        Assert.Equal(2, result.Summary.TotalMarks);
    }

    [Fact]
    public async Task Downstream_service_failure_returns_clean_provider_failure_result()
    {
        var handler = CreateHandler(
            null,
            DefaultAnswerKey(),
            new ExamLookupResult(ExamId, "Test", 2, 1),
            submissionLookupException: new HttpRequestException("connection refused"));

        var result = await handler.HandleAsync(new GetResultQuery(ExamId, "token"));

        Assert.False(result.Success);
        Assert.True(result.IsProviderFailure);
        Assert.NotNull(result.ProviderErrorMessage);
        Assert.Null(result.Summary);
    }
}
