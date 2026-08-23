using OnlineExamSystem.Execution.Application.Interfaces;

namespace OnlineExamSystem.Execution.Application.Tests.Fakes;

public class FakePistonClient : IPistonClient
{
    private readonly Queue<PistonExecutionResult> _results = new();
    private readonly Exception? _throwOnExecute;

    public List<IReadOnlyList<PistonFile>> ReceivedFiles { get; } = [];

    public FakePistonClient(params PistonExecutionResult[] results)
    {
        foreach (var result in results)
        {
            _results.Enqueue(result);
        }
    }

    public FakePistonClient(Exception throwOnExecute)
    {
        _throwOnExecute = throwOnExecute;
    }

    public Task<PistonExecutionResult> ExecuteAsync(
        string pistonLanguage,
        string pistonVersion,
        IReadOnlyList<PistonFile> files,
        CancellationToken cancellationToken = default)
    {
        ReceivedFiles.Add(files);
        if (_throwOnExecute is not null)
        {
            throw _throwOnExecute;
        }

        return Task.FromResult(_results.Dequeue());
    }
}
