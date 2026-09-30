using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.ConfirmEmail;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Authentication;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class ConfirmEmailHandlerTests
{
    private static readonly JwtTokenService JwtService = JwtTestHelper.CreateService();

    private static ConfirmEmailHandler CreateHandler(FakeUserRepository repository) =>
        new(repository, new ConfirmEmailValidator(), JwtService);

    private static async Task<(AppUser User, string RawToken)> SeedUnconfirmedUserWithToken(
        FakeUserRepository repository,
        DateTime? expiresAtUtc = null,
        DateTime? usedAtUtc = null)
    {
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com", EmailConfirmed = false };
        await repository.AddAsync(user);

        var rawToken = "raw-test-token-" + Guid.NewGuid();
        await repository.AddEmailConfirmationTokenAsync(new EmailConfirmationToken
        {
            UserId = user.Id,
            TokenHash = JwtService.HashToken(rawToken),
            ExpiresAtUtc = expiresAtUtc ?? DateTime.UtcNow.AddHours(24),
            UsedAtUtc = usedAtUtc,
        });
        return (user, rawToken);
    }

    [Fact]
    public async Task Valid_token_confirms_the_email_and_marks_the_token_used()
    {
        var repository = new FakeUserRepository();
        var (user, rawToken) = await SeedUnconfirmedUserWithToken(repository);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ConfirmEmailCommand(rawToken));

        Assert.True(result.Success);
        Assert.False(result.AlreadyConfirmed);
        var stored = await repository.GetByIdAsync(user.Id);
        Assert.True(stored!.EmailConfirmed);
        Assert.NotNull(repository.EmailConfirmationTokens[0].UsedAtUtc);
    }

    [Fact]
    public async Task Unknown_token_is_rejected_as_invalid_or_expired()
    {
        var repository = new FakeUserRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ConfirmEmailCommand("does-not-exist"));

        Assert.False(result.Success);
        Assert.True(result.IsInvalidOrExpiredToken);
    }

    [Fact]
    public async Task Expired_token_is_rejected_as_invalid_or_expired()
    {
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUnconfirmedUserWithToken(repository, expiresAtUtc: DateTime.UtcNow.AddMinutes(-1));
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ConfirmEmailCommand(rawToken));

        Assert.False(result.Success);
        Assert.True(result.IsInvalidOrExpiredToken);
    }

    [Fact]
    public async Task Reusing_the_link_after_it_already_confirmed_the_account_reports_already_confirmed()
    {
        // Clicking the same confirmation link twice (or having it open in
        // two tabs) is a real, harmless case - it should read as "you're
        // already confirmed", not as a broken/expired link.
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUnconfirmedUserWithToken(repository);
        var handler = CreateHandler(repository);
        await handler.HandleAsync(new ConfirmEmailCommand(rawToken));

        var result = await handler.HandleAsync(new ConfirmEmailCommand(rawToken));

        Assert.True(result.Success);
        Assert.True(result.AlreadyConfirmed);
    }

    [Fact]
    public async Task A_used_token_for_a_still_unconfirmed_account_is_rejected_as_invalid_or_expired()
    {
        // Distinguishes the "already confirmed" case above from a
        // genuinely stale used token - shouldn't happen in practice (the
        // handler always confirms when it marks a token used) but guards
        // the branch logic explicitly.
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUnconfirmedUserWithToken(repository, usedAtUtc: DateTime.UtcNow.AddMinutes(-5));
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ConfirmEmailCommand(rawToken));

        Assert.False(result.Success);
        Assert.True(result.IsInvalidOrExpiredToken);
    }
}
