namespace OnlineExamSystem.Execution.Domain;

// Thrown when a coding question's StarterCode isn't shaped the way its
// driver generator requires (a "class Solution { ... }" stub matching the
// question's FunctionName) - surfaced to the student/admin as a clear
// per-test-case error instead of a confusing raw compiler error. Without
// this, e.g. JavaDriverGenerator's single-file driver silently appends the
// student's whole file unmodified when it can't find "class Solution" to
// rename, producing a "duplicate class Main" compiler error that gives no
// hint the real problem is the starter code's shape.
public class DriverGenerationException : Exception
{
    public DriverGenerationException(string message) : base(message)
    {
    }
}
