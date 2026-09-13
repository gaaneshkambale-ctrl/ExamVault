using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Result.Application.Interfaces;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Result.Infrastructure;

// Mints a short-lived JWT for ResultService's own service-to-service calls,
// using the same shared HMAC signing key every API already validates
// against - not derived from any live user session or refresh token. Used
// exactly once, in GetResultHandler: to fetch every attempt on an exam (via
// SubmissionService's Admin/Instructor-only by-exam endpoint) so a
// STUDENT's own Rank/Percentile can be computed. The raw per-student data
// this token unlocks is only ever used in-memory to compute that one
// number and is never serialized back into any HTTP response the student
// receives - the student's own bearer token could never call the by-exam
// endpoint directly, and still can't. Same pattern as ExecutionService's
// own SystemTokenProvider (Execution -> Submission calls for auto-grading).
public class SystemTokenProvider : ISystemTokenProvider
{
    // Fixed, recognizable sentinel - never a real User Service id.
    public static readonly Guid SystemUserId = new("00000000-0000-0000-0000-000000052537");

    private readonly JwtSettings _settings;

    public SystemTokenProvider(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;
    }

    public string CreateToken(Guid tenantId)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, SystemUserId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, SystemUserId.ToString()),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim(TenantClaimTypes.TenantId, tenantId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            // SubmissionsController.ByExam stacks
            // [Authorize(Roles="Admin,Instructor")] + Feature:ResultsOrReports
            // + Permission:Results-View - Role=Admin above satisfies the
            // first; these two claims satisfy the other two (SuperAdmin
            // would bypass those for free, but the Roles attribute requires
            // literally Admin or Instructor, so Role=Admin plus these claims
            // is the minimal set that clears all three).
            new Claim(FeatureClaimTypes.Feature, PlanFeature.Results.ToString()),
            new Claim(PermissionClaimTypes.Permission, "Results - View"),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(2),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
