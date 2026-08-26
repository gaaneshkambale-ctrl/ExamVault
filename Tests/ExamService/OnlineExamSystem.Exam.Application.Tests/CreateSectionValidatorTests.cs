using OnlineExamSystem.Exam.Application.Sections.Create;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class CreateSectionValidatorTests
{
    private readonly CreateSectionValidator _validator = new();

    private static CreateSectionCommand ValidCommand() =>
        new(
            Guid.NewGuid(),
            "C# Fundamentals",
            "Covers the basics.",
            "Answer carefully.",
            0,
            20,
            20,
            24,
            "Free",
            false,
            0,
            true,
            true,
            true);

    [Fact]
    public void Valid_command_passes()
    {
        var result = _validator.Validate(ValidCommand());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Empty_name_fails()
    {
        var command = ValidCommand() with { Name = "" };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Zero_duration_fails()
    {
        var command = ValidCommand() with { DurationMinutes = 0 };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Unknown_navigation_type_fails()
    {
        var command = ValidCommand() with { NavigationType = "NotReal" };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Negative_marks_below_zero_fails()
    {
        var command = ValidCommand() with { NegativeMarks = -1 };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }
}
