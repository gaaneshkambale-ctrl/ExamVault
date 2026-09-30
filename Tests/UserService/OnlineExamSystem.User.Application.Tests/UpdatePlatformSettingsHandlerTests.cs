using OnlineExamSystem.User.Application.Settings.UpdatePlatformSettings;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class UpdatePlatformSettingsHandlerTests
{
    private static UpdatePlatformSettingsCommand ValidCommand(bool? requireEmailVerification) =>
        new(
            PlatformName: "ExamVault",
            PlatformTagline: string.Empty,
            AllowSelfRegistration: true,
            MaintenanceModeEnabled: false,
            PasswordMinLength: 8,
            PasswordRequireUppercase: true,
            PasswordRequireLowercase: true,
            PasswordRequireDigit: true,
            PasswordRequireSpecialChar: false,
            SessionTimeoutMinutes: 15,
            MaxLoginAttempts: 5,
            LockoutMinutes: 15,
            DefaultTrialDurationDays: 15,
            DefaultMaxUsers: null,
            DefaultMaxExams: null,
            DefaultMaxStudents: null,
            N8nWebhookUrl: null,
            DefaultInAppNotificationsEnabled: true,
            DefaultEmailNotificationsEnabled: true,
            UpdatedByUserId: Guid.NewGuid(),
            RequireEmailVerification: requireEmailVerification);

    [Fact]
    public async Task Require_email_verification_is_saved_when_provided()
    {
        var repository = new FakePlatformSettingsRepository { Settings = new PlatformSettings { RequireEmailVerification = true } };
        var handler = new UpdatePlatformSettingsHandler(repository, new UpdatePlatformSettingsValidator());

        var result = await handler.HandleAsync(ValidCommand(requireEmailVerification: false));

        Assert.True(result.Success);
        Assert.False(repository.Settings!.RequireEmailVerification);
    }

    [Fact]
    public async Task Omitted_require_email_verification_keeps_the_stored_value()
    {
        // A settings page that predates the field sends no value - that must
        // never silently switch verification off.
        var repository = new FakePlatformSettingsRepository { Settings = new PlatformSettings { RequireEmailVerification = true } };
        var handler = new UpdatePlatformSettingsHandler(repository, new UpdatePlatformSettingsValidator());

        var result = await handler.HandleAsync(ValidCommand(requireEmailVerification: null));

        Assert.True(result.Success);
        Assert.True(repository.Settings!.RequireEmailVerification);
    }
}
