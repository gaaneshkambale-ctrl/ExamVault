using OnlineExamSystem.Ai.Domain;

namespace OnlineExamSystem.Ai.Application.Generate;

public class GenerateQuestionsResult
{
    public bool Success { get; init; }
    public bool IsProviderFailure { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = [];
    public string? ProviderErrorMessage { get; init; }
    public IReadOnlyList<DraftQuestion> Drafts { get; init; } = [];

    public static GenerateQuestionsResult Ok(IReadOnlyList<DraftQuestion> drafts) =>
        new() { Success = true, Drafts = drafts };

    public static GenerateQuestionsResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };

    public static GenerateQuestionsResult ProviderFailure(string message) =>
        new() { Success = false, IsProviderFailure = true, ProviderErrorMessage = message };
}
