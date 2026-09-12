using OnlineExamSystem.User.Application.Security;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class PasswordPolicyTests
{
    [Fact]
    public void Default_policy_matches_the_original_hardcoded_rules()
    {
        var policy = PasswordPolicy.Default;

        Assert.Empty(policy.Validate("Passw0rd!"));
        Assert.NotEmpty(policy.Validate("short1A"));
        Assert.NotEmpty(policy.Validate("nouppercase1"));
        Assert.NotEmpty(policy.Validate("NOLOWERCASE1"));
        Assert.NotEmpty(policy.Validate("NoDigitsHere"));
    }

    [Fact]
    public void Special_character_rule_is_off_by_default_but_enforced_when_enabled()
    {
        var lenient = PasswordPolicy.Default;
        Assert.Empty(lenient.Validate("Passw0rd1"));

        var strict = lenient with { RequireSpecialChar = true };
        Assert.NotEmpty(strict.Validate("Passw0rd1"));
        Assert.Empty(strict.Validate("Passw0rd1!"));
    }

    [Fact]
    public void Minimum_length_is_configurable()
    {
        var policy = new PasswordPolicy(12, false, false, false, false);

        Assert.NotEmpty(policy.Validate("Short1a"));
        Assert.Empty(policy.Validate("longenoughpassword"));
    }

    [Fact]
    public void Null_or_empty_password_fails_every_enabled_rule()
    {
        var policy = PasswordPolicy.Default;

        var errors = policy.Validate(null);

        Assert.NotEmpty(errors);
    }
}
