using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using OnlineExamSystem.Execution.Application.Interfaces;

namespace OnlineExamSystem.Execution.Infrastructure;

// Wraps the self-hosted Piston API (POST /api/v2/execute). Timeouts and
// memory limits are fixed here, not exposed to callers - a student's Run
// Code click (or the submission-time auto-grader) must never be able to
// request a longer-running or larger sandbox than this.
public class PistonClient : IPistonClient
{
    private const int RunTimeoutMs = 6000;
    private const int CompileTimeoutMs = 12000;
    private const long RunMemoryLimitBytes = 256 * 1024 * 1024;
    private const long CompileMemoryLimitBytes = 512 * 1024 * 1024;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _httpClient;

    public PistonClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<PistonExecutionResult> ExecuteAsync(
        string pistonLanguage,
        string pistonVersion,
        IReadOnlyList<PistonFile> files,
        CancellationToken cancellationToken = default)
    {
        var request = new ExecuteRequest
        {
            Language = pistonLanguage,
            Version = pistonVersion,
            Files = files.Select(f => new ExecuteFile { Name = f.Name, Content = f.Content }).ToList(),
            RunTimeout = RunTimeoutMs,
            CompileTimeout = CompileTimeoutMs,
            RunMemoryLimit = RunMemoryLimitBytes,
            CompileMemoryLimit = CompileMemoryLimitBytes,
        };

        using var response = await _httpClient.PostAsJsonAsync("api/v2/execute", request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<ExecuteResponse>(JsonOptions, cancellationToken)
            ?? throw new InvalidOperationException("Empty response from Piston.");

        return new PistonExecutionResult(
            body.Compile?.Stdout,
            body.Compile?.Stderr,
            body.Compile?.Code,
            body.Run.Stdout,
            body.Run.Stderr,
            body.Run.Code);
    }

    private sealed class ExecuteRequest
    {
        [JsonPropertyName("language")]
        public string Language { get; init; } = string.Empty;

        [JsonPropertyName("version")]
        public string Version { get; init; } = string.Empty;

        [JsonPropertyName("files")]
        public List<ExecuteFile> Files { get; init; } = [];

        [JsonPropertyName("run_timeout")]
        public int RunTimeout { get; init; }

        [JsonPropertyName("compile_timeout")]
        public int CompileTimeout { get; init; }

        [JsonPropertyName("run_memory_limit")]
        public long RunMemoryLimit { get; init; }

        [JsonPropertyName("compile_memory_limit")]
        public long CompileMemoryLimit { get; init; }
    }

    private sealed class ExecuteFile
    {
        [JsonPropertyName("name")]
        public string Name { get; init; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; init; } = string.Empty;
    }

    private sealed class ExecuteResponse
    {
        public ExecuteRunResult Run { get; init; } = new();
        public ExecuteRunResult? Compile { get; init; }
    }

    private sealed class ExecuteRunResult
    {
        public string Stdout { get; init; } = string.Empty;
        public string Stderr { get; init; } = string.Empty;
        public int Code { get; init; }
    }
}
