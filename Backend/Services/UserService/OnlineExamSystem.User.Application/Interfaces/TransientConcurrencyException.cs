namespace OnlineExamSystem.User.Application.Interfaces;

/// <summary>Thrown by IUnitOfWorkTransaction.CommitAsync when the underlying
/// database detected a genuine serialization conflict (two concurrent
/// Serializable transactions racing the same Max* limit check) and had to
/// pick one as a victim. Provider-agnostic on purpose - the Application
/// layer catches this without needing to know it started life as a SQL
/// Server deadlock error. The losing request should simply be retried by
/// the caller (a real, if rare, "please try again" case, not a bug).</summary>
public sealed class TransientConcurrencyException : Exception
{
    public TransientConcurrencyException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
