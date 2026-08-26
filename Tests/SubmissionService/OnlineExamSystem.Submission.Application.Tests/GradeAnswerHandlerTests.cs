using OnlineExamSystem.Submission.Application.Attempts.Grade;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class GradeAnswerHandlerTests
{
    private static readonly Guid AttemptId = Guid.NewGuid();
    private static readonly Guid QuestionId = Guid.NewGuid();
    private static readonly Guid AdminUserId = Guid.NewGuid();

    private static GradeAnswerHandler CreateHandler(FakeSubmissionRepository repository) =>
        new(repository, new GradeAnswerValidator());

    [Fact]
    public async Task Valid_request_grades_answered_question()
    {
        var repository = new FakeSubmissionRepository();
        repository.SeedAnswer(new AttemptAnswer
        {
            AttemptId = AttemptId,
            QuestionId = QuestionId,
            AnswerText = "public class Solution {}",
            AnsweredAtUtc = DateTime.UtcNow,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new GradeAnswerCommand(AttemptId, QuestionId, 8, AdminUserId));

        Assert.True(result.Success);
        Assert.Equal(8, result.Answer!.MarksAwarded);
        Assert.Equal(AdminUserId, result.Answer.GradedByUserId);
        Assert.NotNull(result.Answer.GradedAtUtc);
    }

    [Fact]
    public async Task Missing_answer_returns_not_found()
    {
        var repository = new FakeSubmissionRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new GradeAnswerCommand(AttemptId, QuestionId, 8, AdminUserId));

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }

    [Fact]
    public async Task Unanswered_question_returns_not_answered()
    {
        var repository = new FakeSubmissionRepository();
        repository.SeedAnswer(new AttemptAnswer
        {
            AttemptId = AttemptId,
            QuestionId = QuestionId,
            AnswerText = null,
            AnsweredAtUtc = DateTime.UtcNow,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new GradeAnswerCommand(AttemptId, QuestionId, 8, AdminUserId));

        Assert.False(result.Success);
        Assert.True(result.IsNotAnswered);
    }

    [Fact]
    public async Task Negative_marks_fails_validation()
    {
        var repository = new FakeSubmissionRepository();
        repository.SeedAnswer(new AttemptAnswer
        {
            AttemptId = AttemptId,
            QuestionId = QuestionId,
            AnswerText = "code",
            AnsweredAtUtc = DateTime.UtcNow,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new GradeAnswerCommand(AttemptId, QuestionId, -1, AdminUserId));

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
    }
}
