using OnlineExamSystem.Result.Application.GetResult;
using OnlineExamSystem.Result.Application.Interfaces;
using OnlineExamSystem.Result.Application.Tests.Fakes;
using Xunit;

namespace OnlineExamSystem.Result.Application.Tests;

public class GetResultHandlerTests
{
    private static readonly Guid ExamId = Guid.NewGuid();
    private static readonly Guid AttemptId = Guid.NewGuid();
    private static readonly Guid Question1Id = Guid.NewGuid();
    private static readonly Guid Question2Id = Guid.NewGuid();
    private static readonly Guid Question1CorrectOptionId = Guid.NewGuid();
    private static readonly Guid Question1WrongOptionId = Guid.NewGuid();
    private static readonly Guid Question2CorrectOptionId = Guid.NewGuid();

    private static GetResultHandler CreateHandler(
        SubmissionLookupResult? submission,
        IReadOnlyList<AnswerKeyQuestion> answerKey,
        ExamLookupResult? exam) =>
        new(
            new FakeSubmissionLookupClient(submission),
            new FakeQuestionAnswerKeyClient(answerKey),
            new FakeExamLookupClient(exam));

    private static SubmissionLookupResult Submitted(IReadOnlyList<SubmissionAnswer> answers) =>
        new(AttemptId, ExamId, "Submitted", DateTime.UtcNow, answers);

    private static IReadOnlyList<AnswerKeyQuestion> DefaultAnswerKey() =>
        [
            new AnswerKeyQuestion(Question1Id, 1, Question1CorrectOptionId),
            new AnswerKeyQuestion(Question2Id, 1, Question2CorrectOptionId),
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
        var submission = new SubmissionLookupResult(AttemptId, ExamId, "InProgress", null, []);
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
    public async Task Exam_not_found_returns_exam_not_found()
    {
        var handler = CreateHandler(Submitted([]), DefaultAnswerKey(), null);

        var result = await handler.HandleAsync(new GetResultQuery(ExamId, "token"));

        Assert.True(result.IsExamNotFound);
    }
}
