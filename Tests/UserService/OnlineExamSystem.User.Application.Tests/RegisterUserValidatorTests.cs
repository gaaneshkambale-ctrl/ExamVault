using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.Register;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class RegisterUserValidatorTests
{
    // The password rule is now DB-backed (Security Settings > Password Policy
    // via IPasswordPolicyProvider), so this validator is inherently async -
    // FluentValidation throws if a sync Validate() is called on a validator
    // with an async rule, hence ValidateAsync everywhere below.
    private readonly RegisterUserValidator _validator = new(new FakePasswordPolicyProvider());

    [Fact]
    public async Task Valid_command_passes()
    {
        var command = new RegisterUserCommand("Jane Doe", "jane@example.com", "Passw0rd!");

        var result = await _validator.ValidateAsync(command);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("", "jane@example.com", "Passw0rd!")]
    [InlineData("Jane Doe", "not-an-email", "Passw0rd!")]
    [InlineData("Jane Doe", "jane@example.com", "short1A")]
    [InlineData("Jane Doe", "jane@example.com", "nouppercase1")]
    [InlineData("Jane Doe", "jane@example.com", "NOLOWERCASE1")]
    [InlineData("Jane Doe", "jane@example.com", "NoDigitsHere")]
    public async Task Invalid_command_fails(string fullName, string email, string password)
    {
        var command = new RegisterUserCommand(fullName, email, password);

        var result = await _validator.ValidateAsync(command);

        Assert.False(result.IsValid);
    }
}
