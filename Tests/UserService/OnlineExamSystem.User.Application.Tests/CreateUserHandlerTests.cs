using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.Create;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class CreateUserHandlerTests
{
    private static async Task<Tenant> SeedTenantAsync(FakeTenantRepository tenantRepository)
    {
        var tenant = new Tenant { Name = "Acme", Slug = "acme", IsActive = true };
        await tenantRepository.AddAsync(tenant);
        return tenant;
    }

    private static CreateUserHandler CreateHandler(
        FakeUserRepository userRepository,
        FakeTenantRepository tenantRepository) => new(
        userRepository,
        tenantRepository,
        new CreateUserValidator(),
        new PasswordHasher<AppUser>(),
        new FakePasswordGenerator(),
        new FakeEmailDispatcher(),
        new FakeTenantUrlBuilder(),
        NullLogger<CreateUserHandler>.Instance);

    [Fact]
    public async Task Valid_command_creates_an_inactive_user_requiring_a_password_change()
    {
        var userRepository = new FakeUserRepository();
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenantAsync(tenantRepository);
        var handler = CreateHandler(userRepository, tenantRepository);
        var command = new CreateUserCommand(
            tenant.Id, "Jane Doe", "jane@example.com", "Instructor",
            PhoneNumber: "+91 98765 43210");

        var result = await handler.HandleAsync(command);

        Assert.True(result.Success);
        Assert.False(result.User!.IsActive);
        Assert.True(result.User!.MustChangePassword);
    }

    [Fact]
    public async Task Duplicate_email_in_the_same_tenant_returns_conflict()
    {
        var userRepository = new FakeUserRepository();
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenantAsync(tenantRepository);
        var handler = CreateHandler(userRepository, tenantRepository);
        var command = new CreateUserCommand(
            tenant.Id, "Jane Doe", "jane@example.com", "Instructor",
            PhoneNumber: "+91 98765 43210");
        await handler.HandleAsync(command);

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.True(result.EmailAlreadyExists);
    }

    [Fact]
    public async Task Concurrent_duplicate_email_returns_conflict_instead_of_throwing()
    {
        // Simulates two Add User requests for the same email racing past the
        // existingUser pre-check (which runs before the Serializable
        // transaction even opens - see CreateUserHandler's own comment)
        // before either commits. The loser should still get a clean
        // Conflict result, not an unhandled 500.
        var userRepository = new FakeUserRepository { ThrowDuplicateKeyOnNextSaveChanges = true };
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenantAsync(tenantRepository);
        var handler = CreateHandler(userRepository, tenantRepository);
        var command = new CreateUserCommand(
            tenant.Id, "Jane Doe", "jane@example.com", "Instructor",
            PhoneNumber: "+91 98765 43210");

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.True(result.EmailAlreadyExists);
    }

    [Fact]
    public async Task Tenant_at_its_MaxUsers_limit_is_rejected()
    {
        var userRepository = new FakeUserRepository();
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenantAsync(tenantRepository);
        tenant.MaxUsers = 1;
        await userRepository.AddAsync(new AppUser { TenantId = tenant.Id, FullName = "Existing", Email = "existing@example.com" });
        var handler = CreateHandler(userRepository, tenantRepository);
        var command = new CreateUserCommand(
            tenant.Id, "Jane Doe", "jane@example.com", "Instructor",
            PhoneNumber: "+91 98765 43210");

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.Contains(result.ValidationErrors, e => e.Contains("limit", StringComparison.OrdinalIgnoreCase));
    }
}
