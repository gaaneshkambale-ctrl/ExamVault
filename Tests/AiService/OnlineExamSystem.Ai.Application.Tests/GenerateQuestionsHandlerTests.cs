using Microsoft.Extensions.Logging.Abstractions;
using OnlineExamSystem.Ai.Application.Generate;
using OnlineExamSystem.Ai.Application.Tests.Fakes;
using OnlineExamSystem.Ai.Domain;
using Xunit;

namespace OnlineExamSystem.Ai.Application.Tests;

public class GenerateQuestionsHandlerTests
{
    private static GenerateQuestionsHandler CreateHandler(FakeAiQuestionGenerator generator) =>
        new(generator, new GenerateQuestionsValidator(), NullLogger<GenerateQuestionsHandler>.Instance);

    private static GenerateQuestionsRequest ValidRequest() =>
        new(
            "TopicText",
            null,
            "C# basics",
            2,
            ["MultipleChoice"],
            ["Easy"],
            null);

    [Fact]
    public async Task Valid_request_returns_drafts_from_generator()
    {
        var drafts = new List<DraftQuestion>
        {
            new()
            {
                QuestionType = "MultipleChoice",
                QuestionText = "What is C#?",
                Marks = 1,
                Difficulty = "Easy",
                Options =
                [
                    new DraftQuestionOption { OptionText = "A language", IsCorrect = true },
                    new DraftQuestionOption { OptionText = "A database", IsCorrect = false },
                ],
            },
        };
        var generator = new FakeAiQuestionGenerator(drafts);
        var handler = CreateHandler(generator);

        var result = await handler.HandleAsync(ValidRequest());

        Assert.True(result.Success);
        Assert.Single(result.Drafts);
        Assert.Equal(1, generator.CallCount);
    }

    [Fact]
    public async Task Invalid_request_does_not_call_generator()
    {
        var generator = new FakeAiQuestionGenerator();
        var handler = CreateHandler(generator);
        var request = ValidRequest() with { Topic = "" };

        var result = await handler.HandleAsync(request);

        Assert.False(result.Success);
        Assert.False(result.IsProviderFailure);
        Assert.NotEmpty(result.ValidationErrors);
        Assert.Equal(0, generator.CallCount);
    }

    [Fact]
    public async Task Generator_failure_returns_clean_provider_failure_result()
    {
        var generator = new FakeAiQuestionGenerator(exceptionToThrow: new HttpRequestException("timed out"));
        var handler = CreateHandler(generator);

        var result = await handler.HandleAsync(ValidRequest());

        Assert.False(result.Success);
        Assert.True(result.IsProviderFailure);
        Assert.NotNull(result.ProviderErrorMessage);
        Assert.Empty(result.Drafts);
    }
}
