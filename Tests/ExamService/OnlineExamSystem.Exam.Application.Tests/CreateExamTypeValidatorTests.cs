using OnlineExamSystem.Exam.Application.ExamTypes.Create;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class CreateExamTypeValidatorTests
{
    private readonly CreateExamTypeValidator _validator = new();

    private static CreateExamTypeCommand ValidCommand() =>
        new("Practice Exam", "Student practice, usually unlimited attempts.");

    [Fact]
    public void Valid_command_passes()
    {
        var result = _validator.Validate(ValidCommand());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Blank_defaults_are_valid()
    {
        var result = _validator.Validate(new CreateExamTypeCommand("Practice Exam", null));

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Empty_name_fails()
    {
        var command = ValidCommand() with { Name = "" };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Non_positive_default_duration_fails(int duration)
    {
        var command = ValidCommand() with { DefaultDurationMinutes = duration };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void Passing_score_outside_0_to_100_fails(int score)
    {
        var command = ValidCommand() with { PassingScorePercent = score };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Passing_score_boundaries_are_valid()
    {
        Assert.True(_validator.Validate(ValidCommand() with { PassingScorePercent = 0 }).IsValid);
        Assert.True(_validator.Validate(ValidCommand() with { PassingScorePercent = 100 }).IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-2)]
    public void Non_positive_max_attempts_fails(int attempts)
    {
        var command = ValidCommand() with { DefaultMaxAttempts = attempts };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Negative_marking_value_below_zero_fails()
    {
        var command = ValidCommand() with { NegativeMarkingValue = -0.25m };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Negative_marking_enabled_without_value_fails()
    {
        var command = ValidCommand() with { NegativeMarkingEnabled = true, NegativeMarkingValue = null };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Negative_marking_enabled_with_value_passes()
    {
        var command = ValidCommand() with { NegativeMarkingEnabled = true, NegativeMarkingValue = 0.25m };

        var result = _validator.Validate(command);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Negative_marking_disabled_without_value_passes()
    {
        var command = ValidCommand() with { NegativeMarkingEnabled = false, NegativeMarkingValue = null };

        var result = _validator.Validate(command);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("Mock Test 1")]
    [InlineData("Exam-A")]
    [InlineData("Exam #2")]
    [InlineData("123")]
    public void Rejects_name_with_non_letter_characters(string name)
    {
        var command = ValidCommand() with { Name = name };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateExamTypeCommand.Name));
    }

    [Theory]
    [InlineData("Practice Exam")]
    [InlineData("Midterm")]
    [InlineData("Certification Exam")]
    public void Accepts_letters_and_spaces_only_name(string name)
    {
        var command = ValidCommand() with { Name = name };

        var result = _validator.Validate(command);

        Assert.True(result.IsValid);
    }
}
