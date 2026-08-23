using OnlineExamSystem.Submission.Application.Attempts.ListUngradedByExam;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class ListUngradedAnswersByExamHandlerTests
{
    private static readonly Guid ExamId = Guid.NewGuid();
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid QuestionId = Guid.NewGuid();
    private static readonly Guid GradedQuestionId = Guid.NewGuid();
    private static readonly Guid OptionQuestionId = Guid.NewGuid();

    private static ExamAttempt SubmittedAttempt() => new()
    {
        ExamId = ExamId,
        UserId = UserId,
        AttemptNumber = 1,
        StartedAtUtc = DateTime.UtcNow.AddMinutes(-10),
        SubmittedAtUtc = DateTime.UtcNow,
        Status = AttemptStatus.Submitted,
    };

    [Fact]
    public async Task Returns_only_answered_ungraded_code_answers()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = SubmittedAttempt();
        repository.SeedAttempt(attempt);
        repository.SeedAnswer(new AttemptAnswer
        {
            AttemptId = attempt.Id,
            QuestionId = QuestionId,
            AnswerText = "code answer",
            AnsweredAtUtc = DateTime.UtcNow,
        });
        repository.SeedAnswer(new AttemptAnswer
        {
            AttemptId = attempt.Id,
            QuestionId = GradedQuestionId,
            AnswerText = "already graded",
            MarksAwarded = 5,
            AnsweredAtUtc = DateTime.UtcNow,
        });
        repository.SeedAnswer(new AttemptAnswer
        {
            AttemptId = attempt.Id,
            QuestionId = OptionQuestionId,
            SelectedOptionId = Guid.NewGuid(),
            AnsweredAtUtc = DateTime.UtcNow,
        });
        var handler = new ListUngradedAnswersByExamHandler(repository);

        var result = await handler.HandleAsync(new ListUngradedAnswersByExamQuery(ExamId));

        var ungraded = Assert.Single(result);
        Assert.Equal(QuestionId, ungraded.QuestionId);
        Assert.Equal(UserId, ungraded.UserId);
        Assert.Equal("code answer", ungraded.AnswerText);
    }

    [Fact]
    public async Task No_submitted_attempts_returns_empty()
    {
        var repository = new FakeSubmissionRepository();
        var handler = new ListUngradedAnswersByExamHandler(repository);

        var result = await handler.HandleAsync(new ListUngradedAnswersByExamQuery(ExamId));

        Assert.Empty(result);
    }
}
