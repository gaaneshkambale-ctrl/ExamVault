using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.ForgotPassword;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class ForgotPasswordHandlerTests
{
    private static ForgotPasswordHandler CreateHandler(
        FakeUserRepository repository,
        FakeTenantRepository? tenantRepository,
        FakeEmailDispatcher emailDispatcher) =>
        new(
            repository,
            tenantRepository ?? new FakeTenantRepository(),
            new ForgotPasswordValidator(),
            JwtTestHelper.CreateService(),
            emailDispatcher,
            new FakeTenantUrlBuilder(),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<ForgotPasswordHandler>.Instance);

    private static async Task<(Tenant Tenant, AppUser User)> SeedTenantAndUser(
        FakeTenantRepository tenantRepository,
        FakeUserRepository userRepository,
        bool userIsActive = true)
    {
        var tenant = new Tenant { Name = "Stanford", Slug = "stanford", IsActive = true };
        await tenantRepository.AddAsync(tenant);
        var user = new AppUser
        {
            FullName = "Jane Doe",
            Email = "jane@example.com",
            TenantId = tenant.Id,
            IsActive = userIsActive,
        };
        user.PasswordHash = new PasswordHasher<AppUser>().HashPassword(user, "OldPassw0rd!");
        await userRepository.AddAsync(user);
        return (tenant, user);
    }

    [Fact]
    public async Task Known_email_sends_a_reset_email_and_stores_a_token()
    {
        var tenantRepository = new FakeTenantRepository();
        var userRepository = new FakeUserRepository();
        var emailDispatcher = new FakeEmailDispatcher();
        var (tenant, user) = await SeedTenantAndUser(tenantRepository, userRepository);
        var handler = CreateHandler(userRepository, tenantRepository, emailDispatcher);

        var result = await handler.HandleAsync(new ForgotPasswordCommand("jane@example.com", tenant.Slug));

        Assert.True(result.Success);
        Assert.Single(emailDispatcher.SentEmails);
        Assert.Equal(user.Email, emailDispatcher.SentEmails[0].ToEmail);
        Assert.Single(userRepository.PasswordResetTokens);
        Assert.Equal(user.Id, userRepository.PasswordResetTokens[0].UserId);
    }

    [Fact]
    public async Task Unknown_email_returns_the_same_generic_success_without_sending_an_email()
    {
        var tenantRepository = new FakeTenantRepository();
        var tenant = new Tenant { Name = "Stanford", Slug = "stanford", IsActive = true };
        await tenantRepository.AddAsync(tenant);
        var userRepository = new FakeUserRepository();
        var emailDispatcher = new FakeEmailDispatcher();
        var handler = CreateHandler(userRepository, tenantRepository, emailDispatcher);

        var result = await handler.HandleAsync(new ForgotPasswordCommand("nobody@example.com", tenant.Slug));

        Assert.True(result.Success);
        Assert.Empty(emailDispatcher.SentEmails);
        Assert.Empty(userRepository.PasswordResetTokens);
    }

    [Fact]
    public async Task Unknown_tenant_slug_returns_the_same_generic_success_without_revealing_the_slug_is_missing()
    {
        var userRepository = new FakeUserRepository();
        var emailDispatcher = new FakeEmailDispatcher();
        var handler = CreateHandler(userRepository, new FakeTenantRepository(), emailDispatcher);

        var result = await handler.HandleAsync(new ForgotPasswordCommand("jane@example.com", "does-not-exist"));

        Assert.True(result.Success);
        Assert.Empty(emailDispatcher.SentEmails);
    }

    [Fact]
    public async Task Inactive_user_returns_generic_success_without_sending_an_email()
    {
        var tenantRepository = new FakeTenantRepository();
        var userRepository = new FakeUserRepository();
        var emailDispatcher = new FakeEmailDispatcher();
        var (tenant, _) = await SeedTenantAndUser(tenantRepository, userRepository, userIsActive: false);
        var handler = CreateHandler(userRepository, tenantRepository, emailDispatcher);

        var result = await handler.HandleAsync(new ForgotPasswordCommand("jane@example.com", tenant.Slug));

        Assert.True(result.Success);
        Assert.Empty(emailDispatcher.SentEmails);
    }

    [Fact]
    public async Task Empty_email_is_rejected_as_invalid_without_touching_the_repository()
    {
        var userRepository = new FakeUserRepository();
        var emailDispatcher = new FakeEmailDispatcher();
        var handler = CreateHandler(userRepository, new FakeTenantRepository(), emailDispatcher);

        var result = await handler.HandleAsync(new ForgotPasswordCommand(""));

        Assert.False(result.Success);
        Assert.Empty(emailDispatcher.SentEmails);
    }
}
