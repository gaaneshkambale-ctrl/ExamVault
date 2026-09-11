using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using OnlineExamSystem.Ai.Application.Generate;
using OnlineExamSystem.Ai.Application.Interfaces;
using OnlineExamSystem.Ai.Domain;

namespace OnlineExamSystem.Ai.Infrastructure;

public class N8nQuestionGenerator : IAiQuestionGenerator
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

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
            questionTypes = string.Join(", ", request.QuestionTypes.Select(FormatQuestionTypeLabel).Distinct()),
        };

        using var response = await _httpClient.PostAsJsonAsync(_webhookUrl, payload, cancellationToken);
        response.EnsureSuccessStatusCode();

        var items = await response.Content.ReadFromJsonAsync<List<N8nGeneratedItem>>(JsonOptions, cancellationToken)
            ?? throw new InvalidOperationException("AI provider response was not a valid JSON array.");

        var fallbackDifficulty = request.DifficultyLevels.Count > 0 ? request.DifficultyLevels[0] : "Medium";

        // Only produce MultiSelect drafts if the admin actually asked for that type -
        // if they only requested Single Choice, a model response with several correct
        // letters still collapses to one (first-listed) correct answer, preserving the
        // old single-correct behavior for that request.
        var allowMultiSelect = request.QuestionTypes.Contains("MultiSelect");

        // Same idea for True/False: the n8n workflow doesn't reliably stick to the
        // requested question types on its own (it can return a True/False-shaped item
        // - two options whose text is "true"/"false" - even when only Single Choice was
        // requested). Without this gate, that item would silently show up as a
        // True/False question in the preview regardless of what the admin asked for.
        var allowTrueFalse = request.QuestionTypes.Contains("TrueFalse");

        return items.Select(item =>
        {
            // The workflow can return items with several correct letters
            // (e.g. CorrectOption: ["A","B","D"]) - these become MultiSelect drafts when
            // requested; otherwise only the first listed correct letter is kept.
            var correctLetters = ExtractCorrectLetters(item.CorrectOption);

            var rawOptions = ExtractOptions(item.ExtensionData);

            // A True/False question is a two-option item whose option texts are
            // "true"/"false" (any casing). Question Service requires the option text
            // to be exactly "True"/"False", so it's normalized here regardless of
            // what casing the model returned. Gated on allowTrueFalse so a
            // True/False-shaped item the model returned unprompted still comes back
            // as the requested type (a two-option MultipleChoice) instead.
            var isTrueFalse = allowTrueFalse
                && rawOptions.Count == 2
                && rawOptions.Select(o => o.Text.Trim().ToLowerInvariant()).OrderBy(t => t)
                    .SequenceEqual(["false", "true"]);

            var isMultiSelect = !isTrueFalse && allowMultiSelect && correctLetters.Count >= 2;
            var effectiveCorrectLetters = isMultiSelect ? correctLetters : correctLetters.Take(1).ToList();

            return new DraftQuestion
            {
                QuestionType = isTrueFalse ? "TrueFalse" : isMultiSelect ? "MultiSelect" : "MultipleChoice",
                QuestionText = item.QuestionText,
                Marks = 1,
                Difficulty = fallbackDifficulty,
                Options = rawOptions
                    .Select(option => new DraftQuestionOption
                    {
                        OptionText = isTrueFalse
                            ? (string.Equals(option.Text.Trim(), "true", StringComparison.OrdinalIgnoreCase) ? "True" : "False")
                            : option.Text,
                        IsCorrect = effectiveCorrectLetters.Contains(option.Letter, StringComparer.OrdinalIgnoreCase),
                    })
                    .ToList(),
            };
        }).ToList();
    }

    private static string FormatQuestionTypeLabel(string type) => type switch
    {
        "MultipleChoice" => "Multiple Choice",
        "MultiSelect" => "Multiple Choice",
        "TrueFalse" => "True/False",
        _ => type,
    };

    // Reads every "Option<letter>" property the workflow returned (OptionA, OptionB, ...
    // OptionZ) rather than a fixed OptionA-D - same "don't hardcode a max" fix as the CSV
    // import's own option-column discovery, so a question with more than four real
    // options isn't silently truncated. Sorted by letter so option order is stable
    // regardless of the JSON property order the workflow happens to emit.
    private static List<(string Letter, string Text)> ExtractOptions(Dictionary<string, JsonElement>? extensionData)
    {
        if (extensionData is null)
        {
            return [];
        }

        return extensionData
            .Where(kv => kv.Key.Length == 7
                && kv.Key.StartsWith("option", StringComparison.OrdinalIgnoreCase)
                && char.IsLetter(kv.Key[6])
                && kv.Value.ValueKind == JsonValueKind.String)
            .Select(kv => (Letter: char.ToUpperInvariant(kv.Key[6]).ToString(), Text: kv.Value.GetString() ?? string.Empty))
            .Where(option => !string.IsNullOrWhiteSpace(option.Text))
            .OrderBy(option => option.Letter, StringComparer.Ordinal)
            .ToList();
    }

    private static List<string> ExtractCorrectLetters(JsonElement correctOption)
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

        return letters;
    }

    private sealed class N8nGeneratedItem
    {
        public string QuestionText { get; init; } = string.Empty;
        public JsonElement CorrectOption { get; init; }
        public string QuestionType { get; init; } = string.Empty;

        // Catches OptionA, OptionB, OptionC, ... - any "Option<letter>" property not
        // otherwise declared above - so ExtractOptions can read as many as the workflow
        // sends instead of being limited to a fixed set of declared properties.
        [JsonExtensionData]
        public Dictionary<string, JsonElement>? ExtensionData { get; init; }
    }
}
