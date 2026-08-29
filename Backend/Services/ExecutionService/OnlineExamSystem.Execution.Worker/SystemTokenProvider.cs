using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Execution.Worker;

// Mints a short-lived JWT for this worker's own service-to-service calls,
// using the same shared HMAC signing key every API already validates
// against - not derived from any live user session or refresh token. The
// worker acts as an admin-equivalent "system" identity so it can call
// Submission Service's Admin-only grading endpoint on a student's behalf,
// same as a human grader would, just automated.
public class SystemTokenProvider
{
    // Fixed, recognizable sentinel - never a real User Service id - so
    // GradedByUserId on an auto-graded answer is visibly distinct from a
    // human admin's id if that distinction ever matters later.
    public static readonly Guid SystemUserId = new("00000000-0000-0000-0000-000000005747");

    private readonly JwtSettings _settings;

    public SystemTokenProvider(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;
    }

    // tenantId comes from the event that triggered this grading run (see
    // CodeAnswerSubmittedEvent.TenantId) - without a real tenant_id claim
    // here, Question/Submission Service's query filters would silently see
    // nothing once they're wired up, breaking all auto-grading.
    public string CreateToken(Guid tenantId)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, SystemUserId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, SystemUserId.ToString()),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim(TenantClaimTypes.TenantId, tenantId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            // The grade endpoint is also gated behind [Authorize(Policy =
            // Exams)] (per-tenant plan feature check) on top of the role
            // check - role="Admin" alone doesn't bypass that (only
            // "SuperAdmin" does), so without this claim every auto-grade
            // call was rejected with 403 regardless of the tenant's actual
            // plan, since this token isn't tied to one.
            new Claim(FeatureClaimTypes.Feature, PlanFeature.Exams.ToString()),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
