using OnlineExamSystem.Ai.Application.Generate;
using Xunit;

namespace OnlineExamSystem.Ai.Application.Tests;

public class GenerateQuestionsValidatorTests
{
    private readonly GenerateQuestionsValidator _validator = new();

    private static GenerateQuestionsRequest ValidRequest() =>
        new(
            "TopicText",
            null,
            "C# basics",
            5,
            ["MultipleChoice"],
            ["Easy"],
            null);

    [Fact]
    public void Valid_request_passes()
    {
        var result = _validator.Validate(ValidRequest());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Valid_existing_exam_request_passes()
    {
        var request = ValidRequest() with { Source = "ExistingExam", ExamId = Guid.NewGuid() };

        var result = _validator.Validate(request);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Unsupported_source_fails()
    {
        var request = ValidRequest() with { Source = "FromDocument" };

        var result = _validator.Validate(request);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Empty_topic_fails()
    {
        var request = ValidRequest() with { Topic = "" };

        var result = _validator.Validate(request);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Null_topic_fails()
    {
        var request = ValidRequest() with { Topic = null };

        var result = _validator.Validate(request);

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(21)]
    public void Question_count_out_of_bounds_fails(int count)
    {
        var request = ValidRequest() with { QuestionCount = count };

        var result = _validator.Validate(request);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Empty_question_types_fails()
    {
        var request = ValidRequest() with { QuestionTypes = [] };

        var result = _validator.Validate(request);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Unsupported_question_type_fails()
    {
        var request = ValidRequest() with { QuestionTypes = ["ShortAnswer"] };

        var result = _validator.Validate(request);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void MultiSelect_question_type_passes()
    {
        var request = ValidRequest() with { QuestionTypes = ["MultiSelect"] };

        var result = _validator.Validate(request);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Empty_difficulty_levels_fails()
    {
        var request = ValidRequest() with { DifficultyLevels = [] };

        var result = _validator.Validate(request);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Unsupported_difficulty_fails()
    {
        var request = ValidRequest() with { DifficultyLevels = ["Expert"] };

        var result = _validator.Validate(request);

        Assert.False(result.IsValid);
    }
}
