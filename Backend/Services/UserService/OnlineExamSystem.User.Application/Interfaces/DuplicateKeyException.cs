namespace OnlineExamSystem.User.Application.Interfaces;

/// <summary>Thrown by IUserRepository.SaveChangesAsync when the database
/// rejected the write because of a unique-index violation (e.g. two
/// concurrent requests both passed a "does this email already exist"
/// check before either one committed - the classic check-then-insert
/// race). Provider-agnostic on purpose, same reasoning as
/// TransientConcurrencyException: the Application layer catches this
/// without needing to know it started life as a SQL Server error 2601/2627.
/// A handler that already does its own "does this exist" pre-check should
/// catch this as a fallback and return that same Conflict/AlreadyExists
/// result, rather than let a genuine race surface as an unhandled 500 -
/// see RegisterUserHandler, CreateUserHandler, UpdateUserHandler and
/// CreateTenantAdminHandler, which all have this exact pre-check-then-write
/// shape.</summary>
public sealed class DuplicateKeyException : Exception
{
    public DuplicateKeyException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
