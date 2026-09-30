using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.ResendConfirmationEmail;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class ResendConfirmationEmailHandlerTests
{
    private static ResendConfirmationEmailHandler CreateHandler(
        FakeUserRepository repository,
        FakeEmailDispatcher emailDispatcher) =>
        new(
            repository,
            new ResendConfirmationEmailValidator(),
            JwtTestHelper.CreateService(),
            emailDispatcher,
            new FakeTenantUrlBuilder(),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<ResendConfirmationEmailHandler>.Instance);

    private static async Task<AppUser> SeedUnconfirmedUser(FakeUserRepository repository)
    {
        var user = new AppUser
        {
            FullName = "Jane Doe",
            Email = "jane@example.com",
            TenantId = TenantConstants.DefaultTenantId,
            EmailConfirmed = false,
        };
        await repository.AddAsync(user);
        return user;
    }

    [Fact]
    public async Task Unconfirmed_account_gets_a_fresh_confirmation_email_and_token()
    {
        var repository = new FakeUserRepository();
        var emailDispatcher = new FakeEmailDispatcher();
        var user = await SeedUnconfirmedUser(repository);
        var handler = CreateHandler(repository, emailDispatcher);

        var result = await handler.HandleAsync(new ResendConfirmationEmailCommand("jane@example.com"));

        Assert.True(result.Success);
        var sent = Assert.Single(emailDispatcher.SentEmails);
        Assert.Equal(user.Email, sent.ToEmail);
        var token = Assert.Single(repository.EmailConfirmationTokens);
        Assert.Equal(user.Id, token.UserId);
    }

    [Fact]
    public async Task Unknown_email_returns_the_same_generic_success_without_sending_an_email()
    {
        var repository = new FakeUserRepository();
        var emailDispatcher = new FakeEmailDispatcher();
        var handler = CreateHandler(repository, emailDispatcher);

        var result = await handler.HandleAsync(new ResendConfirmationEmailCommand("nobody@example.com"));

        Assert.True(result.Success);
        Assert.Empty(emailDispatcher.SentEmails);
    }

    [Fact]
    public async Task Already_confirmed_account_returns_generic_success_without_sending_an_email()
    {
        // Never reveal via a resend attempt that an account is already
        // confirmed - same "never reveal" principle ForgotPasswordHandler
        // documents for itself.
        var repository = new FakeUserRepository();
        var emailDispatcher = new FakeEmailDispatcher();
        var user = await SeedUnconfirmedUser(repository);
        user.EmailConfirmed = true;
        var handler = CreateHandler(repository, emailDispatcher);

        var result = await handler.HandleAsync(new ResendConfirmationEmailCommand("jane@example.com"));

        Assert.True(result.Success);
        Assert.Empty(emailDispatcher.SentEmails);
    }

    [Fact]
    public async Task Empty_email_is_rejected_as_invalid_without_touching_the_repository()
    {
        var repository = new FakeUserRepository();
        var emailDispatcher = new FakeEmailDispatcher();
        var handler = CreateHandler(repository, emailDispatcher);

        var result = await handler.HandleAsync(new ResendConfirmationEmailCommand(""));

        Assert.False(result.Success);
        Assert.Empty(emailDispatcher.SentEmails);
    }
}
