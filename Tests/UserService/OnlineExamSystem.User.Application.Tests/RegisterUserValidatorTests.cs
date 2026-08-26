using OnlineExamSystem.User.Application.Users.Register;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class RegisterUserValidatorTests
{
    private readonly RegisterUserValidator _validator = new();

    [Fact]
    public void Valid_command_passes()
    {
        var command = new RegisterUserCommand("Jane Doe", "jane@example.com", "Passw0rd!");

        var result = _validator.Validate(command);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("", "jane@example.com", "Passw0rd!")]
    [InlineData("Jane Doe", "not-an-email", "Passw0rd!")]
    [InlineData("Jane Doe", "jane@example.com", "short1A")]
    [InlineData("Jane Doe", "jane@example.com", "nouppercase1")]
    [InlineData("Jane Doe", "jane@example.com", "NOLOWERCASE1")]
    [InlineData("Jane Doe", "jane@example.com", "NoDigitsHere")]
    public void Invalid_command_fails(string fullName, string email, string password)
    {
        var command = new RegisterUserCommand(fullName, email, password);

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }
}
