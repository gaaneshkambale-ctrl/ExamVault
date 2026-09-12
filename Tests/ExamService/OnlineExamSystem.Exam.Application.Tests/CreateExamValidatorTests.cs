using OnlineExamSystem.Exam.Application.Exams.Create;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class CreateExamValidatorTests
{
    private readonly CreateExamValidator _validator = new();

    private static CreateExamCommand ValidCommand() =>
        new(
            "C# Fundamentals",
            "Covers the basics of C#.",
            "Technical",
            false,
            "Manual",
            60,
            50,
            25,
            "Answer all questions.",
            Guid.NewGuid(),
            ExamTypeId: Guid.NewGuid());

    [Fact]
    public void Valid_command_passes()
    {
        var result = _validator.Validate(ValidCommand());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Empty_title_fails()
    {
        var command = ValidCommand() with { Title = "" };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Unknown_creation_method_fails()
    {
        var command = ValidCommand() with { CreationMethod = "NotARealType" };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Non_positive_duration_fails(int durationMinutes)
    {
        var command = ValidCommand() with { DurationMinutes = durationMinutes };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Passing_marks_above_total_marks_fails()
    {
        var command = ValidCommand() with { TotalMarks = 50, PassingMarks = 60 };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Null_exam_type_fails()
    {
        var command = ValidCommand() with { ExamTypeId = null };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }
}
