using OnlineExamSystem.Exam.Application.ExamTypes.Update;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class UpdateExamTypeValidatorTests
{
    private readonly UpdateExamTypeValidator _validator = new();

    private static UpdateExamTypeCommand ValidCommand() =>
        new(Guid.NewGuid(), "Practice Exam", "Student practice, usually unlimited attempts.");

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
    public void Non_positive_default_duration_fails()
    {
        var command = ValidCommand() with { DefaultDurationMinutes = 0 };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Passing_score_above_100_fails()
    {
        var command = ValidCommand() with { PassingScorePercent = 150 };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Non_positive_max_attempts_fails()
    {
        var command = ValidCommand() with { DefaultMaxAttempts = 0 };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Negative_marking_value_below_zero_fails()
    {
        var command = ValidCommand() with { NegativeMarkingValue = -1m };

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
        var command = ValidCommand() with { NegativeMarkingEnabled = true, NegativeMarkingValue = 0.5m };

        var result = _validator.Validate(command);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("Mock Test 1")]
    [InlineData("Exam-A")]
    [InlineData("123")]
    public void Rejects_name_with_non_letter_characters(string name)
    {
        var command = ValidCommand() with { Name = name };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(UpdateExamTypeCommand.Name));
    }

    [Fact]
    public void Accepts_letters_and_spaces_only_name()
    {
        var command = ValidCommand() with { Name = "Certification Exam" };

        var result = _validator.Validate(command);

        Assert.True(result.IsValid);
    }
}
