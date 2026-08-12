using OnlineExamSystem.Exam.Application.Exams.Update;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class UpdateExamValidatorTests
{
    private readonly UpdateExamValidator _validator = new();

    private static UpdateExamCommand ValidCommand() =>
        new(
            Guid.NewGuid(),
            "C# Fundamentals",
            "Covers the basics of C#.",
            "Manual",
            60,
            50,
            25,
            "Answer all questions.",
            ShuffleQuestions: true,
            ShuffleOptions: true,
            ShowResult: true,
            ShowCorrectAnswers: false,
            AllowReview: true,
            StartAtUtc: null,
            EndAtUtc: null,
            MaxAttempts: 1,
            NegativeMarkingEnabled: false,
            NegativeMarks: 0);

    [Fact]
    public void Valid_command_passes()
    {
        var result = _validator.Validate(ValidCommand());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Non_positive_max_attempts_fails()
    {
        var command = ValidCommand() with { MaxAttempts = 0 };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Negative_negative_marks_fails()
    {
        var command = ValidCommand() with { NegativeMarks = -1 };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void End_date_before_start_date_fails()
    {
        var start = DateTime.UtcNow;
        var command = ValidCommand() with { StartAtUtc = start, EndAtUtc = start.AddMinutes(-1) };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void End_date_after_start_date_passes()
    {
        var start = DateTime.UtcNow;
        var command = ValidCommand() with { StartAtUtc = start, EndAtUtc = start.AddHours(1) };

        var result = _validator.Validate(command);

        Assert.True(result.IsValid);
    }
}
