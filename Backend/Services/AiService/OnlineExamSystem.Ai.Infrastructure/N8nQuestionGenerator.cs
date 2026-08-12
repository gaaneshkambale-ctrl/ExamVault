using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
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
            chatInput = BuildPrompt(request),
            sessionId = Guid.NewGuid().ToString(),
            action = "sendMessage",
        };

        using var response = await _httpClient.PostAsJsonAsync(_webhookUrl, payload, cancellationToken);
        response.EnsureSuccessStatusCode();

        var envelope = await response.Content.ReadFromJsonAsync<N8nChatResponse>(JsonOptions, cancellationToken)
            ?? throw new InvalidOperationException("Empty response from AI provider.");

        var items = JsonSerializer.Deserialize<List<N8nGeneratedItem>>(ExtractJsonArray(envelope.Output), JsonOptions)
            ?? throw new InvalidOperationException("AI provider response was not a valid JSON array.");

        return items.Select(item => new DraftQuestion
        {
            QuestionType = item.Type,
            QuestionText = item.Question,
            Marks = 1,
            Difficulty = item.Difficulty,
            Options = item.Options
                .Select(optionText => new DraftQuestionOption
                {
                    OptionText = optionText,
                    IsCorrect = string.Equals(optionText, item.Answer, StringComparison.OrdinalIgnoreCase),
                })
                .ToList(),
        }).ToList();
    }

    private static string BuildPrompt(GenerateQuestionsRequest request)
    {
        var typeLabels = request.QuestionTypes.Select(type => type switch
        {
            "MultipleChoice" => "Multiple Choice",
            "TrueFalse" => "True/False",
            _ => type,
        });

        var typeInstruction = request.QuestionTypes.Count == 1
            ? $"Use ONLY this question type: {string.Join(", ", typeLabels)}. Every question must be that type."
            : $"Use a mix of these question types: {string.Join(", ", typeLabels)}.";

        var difficultyInstruction = request.DifficultyLevels.Count == 1
            ? $"Use ONLY this difficulty level: {string.Join(", ", request.DifficultyLevels)}. Every question must be that difficulty."
            : $"Use a mix of these difficulty levels: {string.Join(", ", request.DifficultyLevels)}.";

        var sb = new StringBuilder();
        sb.Append($"Generate {request.QuestionCount} exam questions about: {request.Topic}. ");
        sb.Append($"{typeInstruction} ");
        sb.Append($"{difficultyInstruction} ");
        sb.Append("For Multiple Choice questions provide exactly 4 options. ");
        sb.Append("For True/False questions the options must be exactly [\"True\",\"False\"]. ");
        if (!string.IsNullOrWhiteSpace(request.AdditionalInstructions))
        {
            sb.Append($"Additional instructions: {request.AdditionalInstructions}. ");
        }
        sb.Append("Reply with ONLY a JSON array, no markdown fences, no extra text. ");
        sb.Append("Each item must have fields: type (\"MultipleChoice\" or \"TrueFalse\"), question, ");
        sb.Append("options (array of strings), answer (the exact text of the correct option), ");
        sb.Append("difficulty (\"Easy\", \"Medium\", or \"Hard\").");
        return sb.ToString();
    }

    private static string ExtractJsonArray(string text)
    {
        var trimmed = text.Trim();
        if (!trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            return trimmed;
        }

        var firstNewline = trimmed.IndexOf('\n');
        var lastFence = trimmed.LastIndexOf("```", StringComparison.Ordinal);
        if (firstNewline < 0 || lastFence <= firstNewline)
        {
            return trimmed;
        }

        return trimmed[(firstNewline + 1)..lastFence].Trim();
    }

    private sealed class N8nChatResponse
    {
        public string Output { get; init; } = string.Empty;
    }

    private sealed class N8nGeneratedItem
    {
        public string Type { get; init; } = string.Empty;
        public string Question { get; init; } = string.Empty;
        public List<string> Options { get; init; } = [];
        public string Answer { get; init; } = string.Empty;
        public string Difficulty { get; init; } = string.Empty;
    }
}
