namespace OnlineExamSystem.Exam.Application.ExamTypes;

// Auto-generates the short, immutable "Code" shown next to an exam type's
// name (e.g. "Assessment" -> "ASS-01") - never user-supplied, see
// ExamType.Code's own doc comment. Kept as a static helper (not a service)
// since it's pure: prefix from the name, first unused 2-digit suffix among
// the caller's already-known codes (already tenant-scoped by the time it
// reaches here - see CreateExamTypeHandler).
public static class ExamTypeCodeGenerator
{
    public static string Generate(string name, IEnumerable<string> existingCodes)
    {
        var prefix = BuildPrefix(name);
        var used = new HashSet<string>(existingCodes, StringComparer.OrdinalIgnoreCase);

        for (var sequence = 1; sequence <= 99; sequence++)
        {
            var candidate = $"{prefix}-{sequence:D2}";
            if (!used.Contains(candidate))
            {
                return candidate;
            }
        }

        // Practically unreachable (99 exam types sharing one 3-letter
        // prefix) - a short random suffix keeps this total rather than
        // throwing.
        return $"{prefix}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
    }

    private static string BuildPrefix(string name)
    {
        var letters = new string(name.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        if (letters.Length == 0)
        {
            return "GEN";
        }

        return letters.Length <= 3 ? letters : letters[..3];
    }
}
