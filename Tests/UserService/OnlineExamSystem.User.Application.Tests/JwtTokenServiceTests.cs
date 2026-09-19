using System.IdentityModel.Tokens.Jwt;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class JwtTokenServiceTests
{
    [Fact]
    public void GenerateAccessToken_embeds_the_given_permission_version()
    {
        var jwt = JwtTestHelper.CreateService();
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com" };

        var token = jwt.GenerateAccessToken(user, [], [], permissionVersion: 7);

        var claims = new JwtSecurityTokenHandler().ReadJwtToken(token).Claims;
        var claim = Assert.Single(claims, c => c.Type == PermissionClaimTypes.PermissionVersion);
        Assert.Equal("7", claim.Value);
    }

    [Fact]
    public void GenerateAccessToken_defaults_permission_version_to_zero_for_a_never_touched_tenant()
    {
        var jwt = JwtTestHelper.CreateService();
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com" };

        var token = jwt.GenerateAccessToken(user, [], [], permissionVersion: 0);

        var claims = new JwtSecurityTokenHandler().ReadJwtToken(token).Claims;
        var claim = Assert.Single(claims, c => c.Type == PermissionClaimTypes.PermissionVersion);
        Assert.Equal("0", claim.Value);
    }
}
