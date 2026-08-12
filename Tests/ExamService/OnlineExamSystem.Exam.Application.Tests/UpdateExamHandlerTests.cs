using OnlineExamSystem.Exam.Application.Exams.Update;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class UpdateExamHandlerTests
{
    private static UpdateExamHandler CreateHandler(FakeExamRepository repository) =>
        new(repository, new UpdateExamValidator());

    private static UpdateExamCommand CommandFor(Guid examId) =>
        new(
            examId,
            "C# Fundamentals (Updated)",
            "Updated description.",
            "Manual",
            75,
            50,
            25,
            "Updated instructions.",
            ShuffleQuestions: false,
            ShuffleOptions: false,
            ShowResult: false,
            ShowCorrectAnswers: true,
            AllowReview: false,
            StartAtUtc: null,
            EndAtUtc: null,
            MaxAttempts: 2,
            NegativeMarkingEnabled: true,
            NegativeMarks: 0.25m);

    [Fact]
    public async Task Valid_command_updates_basic_info_and_settings()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals" };
        await repository.AddAsync(exam);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(CommandFor(exam.Id));

        Assert.True(result.Success);
        Assert.Equal("C# Fundamentals (Updated)", result.Exam!.Title);
        Assert.Equal(75, result.Exam!.DurationMinutes);
        Assert.False(result.Exam!.ShuffleQuestions);
        Assert.True(result.Exam!.NegativeMarkingEnabled);
        Assert.Equal(0.25m, result.Exam!.NegativeMarks);
    }

    [Fact]
    public async Task Unknown_exam_returns_not_found()
    {
        var repository = new FakeExamRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(CommandFor(Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }

    [Fact]
    public async Task Invalid_command_returns_validation_errors_without_saving()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals" };
        await repository.AddAsync(exam);
        var handler = CreateHandler(repository);
        var command = CommandFor(exam.Id) with { Title = "" };

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
        Assert.Equal("C# Fundamentals", exam.Title);
    }
}
