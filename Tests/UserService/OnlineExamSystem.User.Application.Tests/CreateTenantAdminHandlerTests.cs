using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using OnlineExamSystem.User.Application.Tenants.CreateAdmin;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class CreateTenantAdminHandlerTests
{
    private static async Task<Tenant> SeedTenantAsync(FakeTenantRepository tenantRepository)
    {
        var tenant = new Tenant { Name = "Acme", Slug = "acme", IsActive = true };
        await tenantRepository.AddAsync(tenant);
        return tenant;
    }

    private static CreateTenantAdminHandler CreateHandler(
        FakeUserRepository userRepository,
        FakeTenantRepository tenantRepository) => new(
        tenantRepository,
        userRepository,
        new CreateTenantAdminValidator(),
        new PasswordHasher<AppUser>(),
        new FakePasswordGenerator(),
        new FakeEmailDispatcher(),
        new FakeTenantUrlBuilder(),
        NullLogger<CreateTenantAdminHandler>.Instance);

    [Fact]
    public async Task Valid_command_creates_an_active_admin_requiring_a_password_change()
    {
        var userRepository = new FakeUserRepository();
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenantAsync(tenantRepository);
        var handler = CreateHandler(userRepository, tenantRepository);
        var command = new CreateTenantAdminCommand(tenant.Id, "Jane Doe", "jane@example.com");

        var result = await handler.HandleAsync(command);

        Assert.True(result.Success);
        Assert.True(result.User!.IsActive);
        Assert.True(result.User!.MustChangePassword);
        Assert.Equal(UserRole.Admin, result.User!.Role);
    }

    [Fact]
    public async Task Unknown_tenant_returns_not_found()
    {
        var userRepository = new FakeUserRepository();
        var tenantRepository = new FakeTenantRepository();
        var handler = CreateHandler(userRepository, tenantRepository);
        var command = new CreateTenantAdminCommand(Guid.NewGuid(), "Jane Doe", "jane@example.com");

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.True(result.TenantNotFound);
    }

    [Fact]
    public async Task Duplicate_email_in_the_same_tenant_returns_conflict()
    {
        var userRepository = new FakeUserRepository();
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenantAsync(tenantRepository);
        var handler = CreateHandler(userRepository, tenantRepository);
        var command = new CreateTenantAdminCommand(tenant.Id, "Jane Doe", "jane@example.com");
        await handler.HandleAsync(command);

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.True(result.EmailAlreadyExists);
    }

    [Fact]
    public async Task Concurrent_duplicate_email_returns_conflict_instead_of_throwing()
    {
        // Simulates two "Add Admin" requests for the same email racing past
        // the existingUser pre-check before either commits - the loser
        // should still get a clean Conflict result, not an unhandled 500.
        var userRepository = new FakeUserRepository { ThrowDuplicateKeyOnNextSaveChanges = true };
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenantAsync(tenantRepository);
        var handler = CreateHandler(userRepository, tenantRepository);
        var command = new CreateTenantAdminCommand(tenant.Id, "Jane Doe", "jane@example.com");

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.True(result.EmailAlreadyExists);
    }
}
