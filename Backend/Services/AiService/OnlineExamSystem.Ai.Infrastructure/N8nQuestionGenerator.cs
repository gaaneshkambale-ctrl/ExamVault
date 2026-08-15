using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using OnlineExamSystem.Ai.Application.Generate;
using OnlineExamSystem.Ai.Application.Interfaces;
using OnlineExamSystem.Ai.Domain;

namespace OnlineExamSystem.Ai.Infrastructure;

public class N8nQuestionGenerator : IAiQuestionGenerator
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly (string Letter, Func<N8nGeneratedItem, string> Selector)[] OptionSelectors =
    [
        ("A", item => item.OptionA),
        ("B", item => item.OptionB),
        ("C", item => item.OptionC),
        ("D", item => item.OptionD),
    ];

    private readonly HttpClient _httpClient;
    private readonly string _webhookUrl;

    public N8nQuestionGenerator(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _webhookUrl = configuration["N8n:WebhookUrl"]
            ?? throw new InvalidOperationException("Missing \"N8n:WebhookUrl\" configuration.");
    }

    public async Task<IReadOnlyList<DraftQuestion>> GenerateAsync(
        GenerateQuestionsRequest request,
        CancellationToken cancellationToken = default)
    {
        var payload = new
        {
            questionCount = request.QuestionCount,
            complexity = string.Join(", ", request.DifficultyLevels),
            subject = request.Topic,
            questionTypes = string.Join(", ", request.QuestionTypes.Select(FormatQuestionTypeLabel)),
        };

        using var response = await _httpClient.PostAsJsonAsync(_webhookUrl, payload, cancellationToken);
        response.EnsureSuccessStatusCode();

        var items = await response.Content.ReadFromJsonAsync<List<N8nGeneratedItem>>(JsonOptions, cancellationToken)
            ?? throw new InvalidOperationException("AI provider response was not a valid JSON array.");

        var fallbackDifficulty = request.DifficultyLevels.Count > 0 ? request.DifficultyLevels[0] : "Medium";

        return items.Select(item =>
        {
            // The workflow can return "Multiple" questions with several correct letters
            // (e.g. CorrectOption: ["A","B","D"]), but this app only supports single-correct
            // MCQ (Question Service enforces exactly one correct option). Only the first
            // listed correct letter is kept; the rest are treated as incorrect.
            var correctLetter = ExtractFirstCorrectLetter(item.CorrectOption);

            var rawOptions = OptionSelectors
                .Select(selector => (selector.Letter, Text: selector.Selector(item)))
                .Where(option => !string.IsNullOrWhiteSpace(option.Text))
                .ToList();

            // A True/False question is a two-option item whose option texts are
            // "true"/"false" (any casing). Question Service requires the option text
            // to be exactly "True"/"False", so it's normalized here regardless of
            // what casing the model returned.
            var isTrueFalse = rawOptions.Count == 2
                && rawOptions.Select(o => o.Text.Trim().ToLowerInvariant()).OrderBy(t => t)
                    .SequenceEqual(["false", "true"]);

            return new DraftQuestion
            {
                QuestionType = isTrueFalse ? "TrueFalse" : "MultipleChoice",
                QuestionText = item.QuestionText,
                Marks = 1,
                Difficulty = fallbackDifficulty,
                Options = rawOptions
                    .Select(option => new DraftQuestionOption
                    {
                        OptionText = isTrueFalse
                            ? (string.Equals(option.Text.Trim(), "true", StringComparison.OrdinalIgnoreCase) ? "True" : "False")
                            : option.Text,
                        IsCorrect = string.Equals(option.Letter, correctLetter, StringComparison.OrdinalIgnoreCase),
                    })
                    .ToList(),
            };
        }).ToList();
    }

    private static string FormatQuestionTypeLabel(string type) => type switch
    {
        "MultipleChoice" => "Multiple Choice",
        "TrueFalse" => "True/False",
        _ => type,
    };

    private static string? ExtractFirstCorrectLetter(JsonElement correctOption)
    {
        var letters = new List<string>();

        if (correctOption.ValueKind == JsonValueKind.String)
        {
            var value = correctOption.GetString();
            if (!string.IsNullOrWhiteSpace(value))
            {
                letters.Add(value.Trim());
            }
        }
        else if (correctOption.ValueKind == JsonValueKind.Array)
        {
            foreach (var element in correctOption.EnumerateArray())
            {
                if (element.ValueKind == JsonValueKind.String)
                {
                    var value = element.GetString();
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        letters.Add(value.Trim());
                    }
                }
            }
        }

        return letters.Count > 0 ? letters[0] : null;
    }

    private sealed class N8nGeneratedItem
    {
        public string QuestionText { get; init; } = string.Empty;
        public string OptionA { get; init; } = string.Empty;
        public string OptionB { get; init; } = string.Empty;
        public string OptionC { get; init; } = string.Empty;
        public string OptionD { get; init; } = string.Empty;
        public JsonElement CorrectOption { get; init; }
        public string QuestionType { get; init; } = string.Empty;
    }
}
