namespace OnlineExamSystem.User.Application.Interfaces;

/// <summary>Thin, EF-agnostic wrapper around a real database transaction - lets a
/// handler serialize a "count current usage, check it against a limit, then
/// insert" sequence (e.g. CreateUserHandler's Max* checks) against a genuine
/// race where two concurrent requests both pass the count check before
/// either commits, together exceeding the limit. Implemented in
/// Infrastructure via EF Core's own BeginTransactionAsync(Serializable) -
/// SQL Server's range locks under that isolation level make a second,
/// concurrent transaction's count query block until the first commits,
/// rather than reading a stale count.</summary>
public interface IUnitOfWorkTransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken cancellationToken = default);
    Task RollbackAsync(CancellationToken cancellationToken = default);
}
