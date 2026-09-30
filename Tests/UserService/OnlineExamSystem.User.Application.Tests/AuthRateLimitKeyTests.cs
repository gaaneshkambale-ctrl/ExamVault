using System.Text;
using OnlineExamSystem.User.Application.Security;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class AuthRateLimitKeyTests
{
    private static string? Extract(string json) => AuthRateLimitKey.ExtractEmail(Encoding.UTF8.GetBytes(json));

    [Theory]
    [InlineData("POST", "/api/users/login")]
    [InlineData("post", "/API/Users/Login")]
    [InlineData("POST", "/api/users/register/")]
    [InlineData("POST", "/api/users/forgot-password")]
    [InlineData("POST", "/api/users/confirm-email")]
    [InlineData("POST", "/api/users/resend-confirmation-email")]
    public void Auth_endpoints_are_recognised(string method, string path)
    {
        Assert.True(AuthRateLimitKey.IsAuthRequest(method, path));
    }

    [Theory]
    [InlineData("GET", "/api/users/login")]
    [InlineData("POST", "/api/users/refresh-token")]
    [InlineData("POST", "/api/users")]
    [InlineData("POST", null)]
    public void Other_requests_are_not_auth_requests(string method, string? path)
    {
        Assert.False(AuthRateLimitKey.IsAuthRequest(method, path));
    }

    [Fact]
    public void Email_is_trimmed_and_lower_cased()
    {
        Assert.Equal("jane@example.com", Extract("""{"email":"  Jane@Example.COM ","password":"x"}"""));
    }

    [Fact]
    public void Email_property_name_is_matched_case_insensitively()
    {
        Assert.Equal("jane@example.com", Extract("""{"Email":"jane@example.com"}"""));
    }

    [Theory]
    [InlineData("""{"token":"abc"}""")]
    [InlineData("""{"email":""}""")]
    [InlineData("""{"email":"   "}""")]
    [InlineData("""{"email":42}""")]
    [InlineData("""["jane@example.com"]""")]
    [InlineData("""{"email":"jane@example.com" """)]
    [InlineData("not json")]
    [InlineData("")]
    public void Missing_or_unusable_email_returns_null(string body)
    {
        Assert.Null(Extract(body));
    }

    [Fact]
    public void Body_over_the_size_cap_is_ignored()
    {
        var padding = new string('a', AuthRateLimitKey.MaxBodyBytes);
        Assert.Null(Extract($$"""{"email":"jane@example.com","pad":"{{padding}}"}"""));
    }

    [Fact]
    public void Different_emails_from_one_ip_get_different_partitions()
    {
        var first = AuthRateLimitKey.PartitionKey("203.0.113.7", "a@example.com");
        var second = AuthRateLimitKey.PartitionKey("203.0.113.7", "b@example.com");

        Assert.NotEqual(first, second);
    }

    [Fact]
    public void No_email_falls_back_to_an_ip_only_partition()
    {
        Assert.Equal("ip:203.0.113.7", AuthRateLimitKey.PartitionKey("203.0.113.7", null));
    }
}
