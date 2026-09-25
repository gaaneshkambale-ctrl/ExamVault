using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tenants.Create;

// Organization Code used to be a free-text field a Super Admin typed by
// hand at creation time, with no uniqueness enforced anywhere - two orgs
// could end up with the identical code. Generating it here instead gives
// every new tenant a real, unique code with zero manual input, in the same
// short acronym style the old placeholder text ("e.g. GFU2026" for
// "Greenfield University") already suggested.
public static class OrganizationCodeGenerator
{
    private static readonly Random Random = new();

    public static async Task<string> GenerateAsync(
        string organizationName,
        ITenantRepository tenantRepository,
        CancellationToken cancellationToken = default)
    {
        var baseCode = BuildBaseCode(organizationName);

        var candidate = baseCode;
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var existing = await tenantRepository.GetByOrganizationCodeAsync(candidate, cancellationToken);
            if (existing is null)
            {
                return candidate;
            }

            candidate = $"{baseCode}-{Random.Next(10, 100)}";
        }

        // Astronomically unlikely to ever be reached (would need 5 straight
        // collisions on the same base code) - fall back to a value that's
        // guaranteed unique instead of failing tenant creation outright.
        return $"{baseCode}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
    }

    private static string BuildBaseCode(string organizationName)
    {
        var words = organizationName
            .Split([' ', '-', '_', '.'], StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Any(char.IsLetter))
            .ToList();

        string acronym;
        if (words.Count > 1)
        {
            acronym = string.Concat(words.Take(4).Select(w => char.ToUpperInvariant(w[0])));
        }
        else
        {
            var letters = new string(organizationName.Where(char.IsLetter).ToArray()).ToUpperInvariant();
            acronym = letters.Length >= 3 ? letters[..3] : letters.PadRight(3, 'X');
        }

        if (acronym.Length == 0)
        {
            acronym = "ORG";
        }

        return $"{acronym}{DateTime.UtcNow.Year}";
    }
}
