using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.Login;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class LoginUserHandlerTests
{
    private static LoginUserHandler CreateHandler(
        FakeUserRepository repository,
        FakeTenantRepository? tenantRepository = null,
        FakePlatformSettingsRepository? platformSettingsRepository = null,
        FakeAuditClient? auditClient = null) =>
        new(
            repository,
            tenantRepository ?? new FakeTenantRepository(),
            new FakePlanRepository(),
            new FakeRolePermissionRepository(),
            platformSettingsRepository ?? new FakePlatformSettingsRepository(),
            new LoginUserValidator(),
            new PasswordHasher<AppUser>(),
            JwtTestHelper.CreateService(),
            auditClient ?? new FakeAuditClient());

    private static async Task<AppUser> SeedUser(
        FakeUserRepository repository,
        string email,
        string password,
        bool isActive = true,
        bool mustChangePassword = false,
        Guid? tenantId = null,
        UserRole role = UserRole.Student)
    {
        var user = new AppUser
        {
            FullName = "Jane Doe",
            Email = email,
            IsActive = isActive,
            MustChangePassword = mustChangePassword,
            Role = role,
        };
        if (tenantId is not null)
        {
            user.TenantId = tenantId.Value;
        }
        user.PasswordHash = new PasswordHasher<AppUser>().HashPassword(user, password);
        await repository.AddAsync(user);
        return user;
    }

    // Most tests below need a real tenant + matching TenantSlug now that
    // bare-domain login (no TenantSlug) is rejected for anyone but
    // SuperAdmin - this seeds one so those tests keep exercising the
    // behavior they're actually about (account state, password checks),
    // not the subdomain restriction itself.
    private static async Task<Tenant> SeedTenant(FakeTenantRepository repository, string slug = "stanford")
    {
        var tenant = new Tenant { Name = "Stanford", Slug = slug, IsActive = true };
        await repository.AddAsync(tenant);
        return tenant;
    }

    [Fact]
    public async Task Correct_email_and_password_returns_the_user()
    {
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenant(tenantRepository);
        var repository = new FakeUserRepository();
        var user = await SeedUser(repository, "jane@example.com", "Passw0rd!", tenantId: tenant.Id);
        var handler = CreateHandler(repository, tenantRepository);

        var result = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "Passw0rd!", TenantSlug: tenant.Slug));

        Assert.True(result.Success);
        Assert.Equal(user.Id, result.User!.Id);
        Assert.False(string.IsNullOrEmpty(result.AccessToken));
        Assert.False(string.IsNullOrEmpty(result.RefreshToken));
    }

    [Fact]
    public async Task Unknown_email_returns_invalid_credentials()
    {
        var repository = new FakeUserRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new LoginUserCommand("nobody@example.com", "Passw0rd!"));

        Assert.False(result.Success);
        Assert.Null(result.User);
    }

    [Fact]
    public async Task Wrong_password_returns_invalid_credentials()
    {
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenant(tenantRepository);
        var repository = new FakeUserRepository();
        await SeedUser(repository, "jane@example.com", "Passw0rd!", tenantId: tenant.Id);
        var handler = CreateHandler(repository, tenantRepository);

        var result = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "WrongPassword1", TenantSlug: tenant.Slug));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task Deactivated_user_with_correct_credentials_is_rejected_as_account_deactivated()
    {
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenant(tenantRepository);
        var repository = new FakeUserRepository();
        await SeedUser(repository, "jane@example.com", "Passw0rd!", isActive: false, tenantId: tenant.Id);
        var handler = CreateHandler(repository, tenantRepository);

        var result = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "Passw0rd!", TenantSlug: tenant.Slug));

        Assert.False(result.Success);
        Assert.True(result.IsAccountDeactivated);
        Assert.Null(result.AccessToken);
    }

    [Fact]
    public async Task Inactive_user_who_still_must_change_password_can_log_in_to_reach_the_reset_screen()
    {
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenant(tenantRepository);
        var repository = new FakeUserRepository();
        var user = await SeedUser(repository, "jane@example.com", "Passw0rd!", isActive: false, mustChangePassword: true, tenantId: tenant.Id);
        var handler = CreateHandler(repository, tenantRepository);

        var result = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "Passw0rd!", TenantSlug: tenant.Slug));

        Assert.True(result.Success);
        Assert.Equal(user.Id, result.User!.Id);
        Assert.False(string.IsNullOrEmpty(result.AccessToken));
    }

    [Fact]
    public async Task Bare_domain_login_is_rejected_for_a_regular_tenant_user()
    {
        var repository = new FakeUserRepository();
        await SeedUser(repository, "jane@example.com", "Passw0rd!", role: UserRole.Admin);
        var handler = CreateHandler(repository);

        // No TenantSlug - the bare-domain path.
        var result = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "Passw0rd!"));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task Bare_domain_login_succeeds_for_super_admin()
    {
        var repository = new FakeUserRepository();
        var user = await SeedUser(repository, "superadmin@examvault.local", "Passw0rd!", role: UserRole.SuperAdmin);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new LoginUserCommand("superadmin@examvault.local", "Passw0rd!"));

        Assert.True(result.Success);
        Assert.Equal(user.Id, result.User!.Id);
    }

    [Fact]
    public async Task Bare_domain_login_succeeds_for_a_new_tenant_admin_completing_their_first_login()
    {
        // Mirrors TenantUrlBuilder.GetLoginUrl: a brand-new tenant starts
        // IsActive=false and its admin is deliberately emailed a
        // bare-domain login URL, since the subdomain 404s until this very
        // login activates the tenant - must stay allowed.
        var tenantRepository = new FakeTenantRepository();
        var tenant = new Tenant { Name = "New Org", Slug = "neworg", IsActive = false };
        await tenantRepository.AddAsync(tenant);

        var repository = new FakeUserRepository();
        var user = await SeedUser(
            repository, "admin@neworg.com", "Passw0rd!",
            isActive: false, mustChangePassword: true, tenantId: tenant.Id, role: UserRole.Admin);
        var handler = CreateHandler(repository, tenantRepository);

        var result = await handler.HandleAsync(new LoginUserCommand("admin@neworg.com", "Passw0rd!"));

        Assert.True(result.Success);
        Assert.Equal(user.Id, result.User!.Id);
    }

    [Fact]
    public async Task Bare_domain_login_is_rejected_for_an_admin_of_an_already_active_tenant()
    {
        var tenantRepository = new FakeTenantRepository();
        var tenant = new Tenant { Name = "Stanford", Slug = "stanford", IsActive = true };
        await tenantRepository.AddAsync(tenant);

        var repository = new FakeUserRepository();
        await SeedUser(repository, "admin@stanford.edu", "Passw0rd!", tenantId: tenant.Id, role: UserRole.Admin);
        var handler = CreateHandler(repository, tenantRepository);

        // No TenantSlug - once the tenant is active, bare-domain login is
        // no longer exempted; must use the subdomain.
        var result = await handler.HandleAsync(new LoginUserCommand("admin@stanford.edu", "Passw0rd!"));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task Empty_credentials_return_invalid_credentials_without_hitting_the_repository()
    {
        var repository = new FakeUserRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new LoginUserCommand("", ""));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task Same_email_in_two_tenants_logs_into_the_one_matching_the_slug()
    {
        var tenantRepository = new FakeTenantRepository();
        var tenantA = new Tenant { Name = "Stanford", Slug = "stanford", IsActive = true };
        var tenantB = new Tenant { Name = "Acme Corp", Slug = "acmecorp", IsActive = true };
        await tenantRepository.AddAsync(tenantA);
        await tenantRepository.AddAsync(tenantB);

        var repository = new FakeUserRepository();
        var userA = await SeedUser(repository, "admin@gmail.com", "Passw0rd!");
        userA.TenantId = tenantA.Id;
        var userB = await SeedUser(repository, "admin@gmail.com", "Passw0rd!");
        userB.TenantId = tenantB.Id;

        var handler = CreateHandler(repository, tenantRepository);

        var result = await handler.HandleAsync(new LoginUserCommand("admin@gmail.com", "Passw0rd!", TenantSlug: "acmecorp"));

        Assert.True(result.Success);
        Assert.Equal(userB.Id, result.User!.Id);
    }

    [Fact]
    public async Task Unknown_tenant_slug_returns_invalid_credentials_without_revealing_the_slug_is_missing()
    {
        var repository = new FakeUserRepository();
        await SeedUser(repository, "jane@example.com", "Passw0rd!");
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "Passw0rd!", TenantSlug: "does-not-exist"));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task Account_locks_out_after_reaching_the_configured_max_failed_attempts()
    {
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenant(tenantRepository);
        var repository = new FakeUserRepository();
        var user = await SeedUser(repository, "jane@example.com", "Passw0rd!", tenantId: tenant.Id);
        var platformSettings = new FakePlatformSettingsRepository
        {
            Settings = new PlatformSettings { MaxLoginAttempts = 3, LockoutMinutes = 15 },
        };
        var handler = CreateHandler(repository, tenantRepository, platformSettings);

        for (var i = 0; i < 2; i++)
        {
            var attempt = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "WrongPassword1", TenantSlug: tenant.Slug));
            Assert.False(attempt.Success);
            Assert.False(attempt.IsAccountLocked);
        }

        var lockingAttempt = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "WrongPassword1", TenantSlug: tenant.Slug));
        Assert.True(lockingAttempt.IsAccountLocked);
        Assert.NotNull(lockingAttempt.LockoutEndUtc);

        // Even the correct password is rejected while locked out.
        var duringLockout = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "Passw0rd!", TenantSlug: tenant.Slug));
        Assert.True(duringLockout.IsAccountLocked);

        var stored = await repository.GetByIdAsync(user.Id);
        Assert.Equal(3, stored!.FailedLoginAttempts);
    }

    [Fact]
    public async Task Locking_out_an_account_records_a_distinct_account_locked_audit_event()
    {
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenant(tenantRepository);
        var repository = new FakeUserRepository();
        await SeedUser(repository, "jane@example.com", "Passw0rd!", tenantId: tenant.Id);
        var platformSettings = new FakePlatformSettingsRepository
        {
            Settings = new PlatformSettings { MaxLoginAttempts = 1, LockoutMinutes = 15 },
        };
        var auditClient = new FakeAuditClient();
        var handler = CreateHandler(repository, tenantRepository, platformSettings, auditClient);

        var result = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "WrongPassword1", TenantSlug: tenant.Slug));

        Assert.True(result.IsAccountLocked);
        Assert.Contains(auditClient.Entries, e => e.Activity == "Failed login");
        Assert.Contains(auditClient.Entries, e => e.Activity == "Account locked");
    }

    [Fact]
    public async Task Successful_login_resets_a_previously_accumulated_failed_attempt_count()
    {
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenant(tenantRepository);
        var repository = new FakeUserRepository();
        var user = await SeedUser(repository, "jane@example.com", "Passw0rd!", tenantId: tenant.Id);
        var platformSettings = new FakePlatformSettingsRepository
        {
            Settings = new PlatformSettings { MaxLoginAttempts = 5, LockoutMinutes = 15 },
        };
        var handler = CreateHandler(repository, tenantRepository, platformSettings);

        await handler.HandleAsync(new LoginUserCommand("jane@example.com", "WrongPassword1", TenantSlug: tenant.Slug));
        await handler.HandleAsync(new LoginUserCommand("jane@example.com", "WrongPassword1", TenantSlug: tenant.Slug));

        var result = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "Passw0rd!", TenantSlug: tenant.Slug));

        Assert.True(result.Success);
        var stored = await repository.GetByIdAsync(user.Id);
        Assert.Equal(0, stored!.FailedLoginAttempts);
        Assert.Null(stored.LockoutEndUtc);
    }

    [Fact]
    public async Task Maintenance_mode_blocks_a_regular_user_but_not_super_admin()
    {
        var tenantRepository = new FakeTenantRepository();
        var tenant = await SeedTenant(tenantRepository);
        var repository = new FakeUserRepository();
        await SeedUser(repository, "jane@example.com", "Passw0rd!", tenantId: tenant.Id);
        var superAdmin = await SeedUser(repository, "superadmin@examvault.local", "Passw0rd!", role: UserRole.SuperAdmin);
        var platformSettings = new FakePlatformSettingsRepository
        {
            Settings = new PlatformSettings { MaintenanceModeEnabled = true },
        };
        var handler = CreateHandler(repository, tenantRepository, platformSettings);

        var regularUserResult = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "Passw0rd!", TenantSlug: tenant.Slug));
        Assert.False(regularUserResult.Success);
        Assert.True(regularUserResult.IsMaintenanceMode);

        var superAdminResult = await handler.HandleAsync(new LoginUserCommand("superadmin@examvault.local", "Passw0rd!"));
        Assert.True(superAdminResult.Success);
        Assert.Equal(superAdmin.Id, superAdminResult.User!.Id);
    }
}
