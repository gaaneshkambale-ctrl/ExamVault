using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Infrastructure.Repositories;

/// <summary>Adapts EF Core's IDbContextTransaction to the Application layer's
/// EF-agnostic IUnitOfWorkTransaction - see that interface's own comment for
/// why this exists (Serializable-isolation race protection for the local
/// MaxExams count-then-insert check). Duplicated from User Service's own
/// copy - same per-service duplication convention as FeaturePolicies etc.</summary>
public sealed class EfUnitOfWorkTransaction : IUnitOfWorkTransaction
{
    // SQL Server's "deadlock victim" error - the one real failure mode a
    // Serializable transaction can hit here (the other outcome, a
    // concurrent transaction's count query blocking until this one
    // commits, isn't an exception at all - it's just a wait, which is the
    // whole point of this isolation level).
    private const int DeadlockVictimErrorNumber = 1205;

    private readonly IDbContextTransaction _transaction;

    public EfUnitOfWorkTransaction(IDbContextTransaction transaction)
    {
        _transaction = transaction;
    }

    public async Task CommitAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await _transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: DeadlockVictimErrorNumber })
        {
            throw new TransientConcurrencyException(
                "This request lost a race with a concurrent one over the same limit check. Please try again.", ex);
        }
        catch (SqlException ex) when (ex.Number == DeadlockVictimErrorNumber)
        {
            throw new TransientConcurrencyException(
                "This request lost a race with a concurrent one over the same limit check. Please try again.", ex);
        }
    }

    public Task RollbackAsync(CancellationToken cancellationToken = default) =>
        _transaction.RollbackAsync(cancellationToken);

    public ValueTask DisposeAsync() => _transaction.DisposeAsync();
}
