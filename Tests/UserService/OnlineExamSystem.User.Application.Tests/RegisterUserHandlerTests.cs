using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.Shared.Events.User;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.Register;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class RegisterUserHandlerTests
{
    private static RegisterUserHandler CreateHandler(
        FakeUserRepository repository,
        FakeEventPublisher? eventPublisher = null,
        FakePlatformSettingsRepository? platformSettingsRepository = null) =>
        new(
            repository,
            new RegisterUserValidator(new FakePasswordPolicyProvider()),
            new PasswordHasher<AppUser>(),
            eventPublisher ?? new FakeEventPublisher(),
            platformSettingsRepository ?? new FakePlatformSettingsRepository());

    [Fact]
    public async Task Valid_registration_creates_user_with_hashed_password()
    {
        var repository = new FakeUserRepository();
        var handler = CreateHandler(repository);
        var command = new RegisterUserCommand("Jane Doe", "jane@example.com", "Passw0rd!");

        var result = await handler.HandleAsync(command);

        Assert.True(result.Success);
        Assert.NotNull(result.User);
        Assert.Equal("jane@example.com", result.User!.Email);
        Assert.NotEqual("Passw0rd!", result.User!.PasswordHash);
    }

    [Fact]
    public async Task Valid_registration_publishes_UserRegisteredEvent()
    {
        var repository = new FakeUserRepository();
        var eventPublisher = new FakeEventPublisher();
        var handler = CreateHandler(repository, eventPublisher);
        var command = new RegisterUserCommand("Jane Doe", "jane@example.com", "Passw0rd!");

        var result = await handler.HandleAsync(command);

        var published = Assert.Single(eventPublisher.PublishedEvents);
        var userRegistered = Assert.IsType<UserRegisteredEvent>(published);
        Assert.Equal(result.User!.Id, userRegistered.UserId);
        Assert.Equal("jane@example.com", userRegistered.Email);
        Assert.Equal("Jane Doe", userRegistered.FullName);
    }

    [Fact]
    public async Task Invalid_command_returns_validation_errors_without_saving()
    {
        var repository = new FakeUserRepository();
        var handler = CreateHandler(repository);
        var command = new RegisterUserCommand("", "not-an-email", "short");

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
        Assert.Null(await repository.GetByEmailAsync("not-an-email"));
    }

    [Fact]
    public async Task Duplicate_email_returns_conflict()
    {
        var repository = new FakeUserRepository();
        var handler = CreateHandler(repository);
        var command = new RegisterUserCommand("Jane Doe", "jane@example.com", "Passw0rd!");
        await handler.HandleAsync(command);

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.True(result.EmailAlreadyExists);
    }

    [Fact]
    public async Task Registration_is_rejected_when_self_registration_is_disabled()
    {
        var repository = new FakeUserRepository();
        var platformSettings = new FakePlatformSettingsRepository
        {
            Settings = new PlatformSettings { AllowSelfRegistration = false },
        };
        var handler = CreateHandler(repository, platformSettingsRepository: platformSettings);
        var command = new RegisterUserCommand("Jane Doe", "jane@example.com", "Passw0rd!");

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.Null(await repository.GetByEmailAsync("jane@example.com"));
    }
}
