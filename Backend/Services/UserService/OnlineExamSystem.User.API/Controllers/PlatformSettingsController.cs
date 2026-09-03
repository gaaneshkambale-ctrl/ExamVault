using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Settings.GetPlatformSettings;
using OnlineExamSystem.User.Application.Settings.UpdatePlatformSettings;
using PlatformSettingsEntity = OnlineExamSystem.User.Domain.Entities.PlatformSettings;

namespace OnlineExamSystem.User.API.Controllers;

// Backs the Super Admin's Platform/Tenant/Email/Notification/Security
// Settings pages - a single platform-wide row (see PlatformSettings.cs's
// own doc comment for why it's not tenant-scoped), Super Admin only.
[ApiController]
[Route("api/platform-settings")]
[Authorize(Roles = "SuperAdmin")]
public class PlatformSettingsController : ControllerBase
{
    private readonly GetPlatformSettingsHandler _getHandler;
    private readonly UpdatePlatformSettingsHandler _updateHandler;
    private readonly IPlatformSettingsRepository _platformSettingsRepository;
    private readonly IEmailDispatcher _emailDispatcher;

    public PlatformSettingsController(
        GetPlatformSettingsHandler getHandler,
        UpdatePlatformSettingsHandler updateHandler,
        IPlatformSettingsRepository platformSettingsRepository,
        IEmailDispatcher emailDispatcher)
    {
        _getHandler = getHandler;
        _updateHandler = updateHandler;
        _platformSettingsRepository = platformSettingsRepository;
        _emailDispatcher = emailDispatcher;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var settings = await _getHandler.HandleAsync(new GetPlatformSettingsQuery(), cancellationToken);
        return Ok(ToResponse(settings));
    }

    // The only genuinely public slice of this controller - Platform Name/
    // Tagline need to render on the sign-in screen before anyone has
    // authenticated at all, so this deliberately opts out of the
    // controller-level [Authorize(Roles = "SuperAdmin")] rather than
    // exposing the full settings row (lockout thresholds, N8n webhook URL,
    // etc.) to an anonymous caller. Uses the read-only lookup, not
    // GetOrCreate - an anonymous page load must never create the settings
    // row as a side effect.
    [HttpGet("branding")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBranding(CancellationToken cancellationToken)
    {
        var settings = await _platformSettingsRepository.GetAsync(cancellationToken);
        return Ok(new
        {
            platformName = settings?.PlatformName ?? "ExamVault",
            platformTagline = settings?.PlatformTagline ?? string.Empty,
        });
    }

    [HttpPut]
    public async Task<IActionResult> Update(UpdatePlatformSettingsRequest request, CancellationToken cancellationToken)
    {
        var command = new UpdatePlatformSettingsCommand(
            request.PlatformName,
            request.PlatformTagline,
            request.AllowSelfRegistration,
            request.MaintenanceModeEnabled,
            request.PasswordMinLength,
            request.PasswordRequireUppercase,
            request.PasswordRequireLowercase,
            request.PasswordRequireDigit,
            request.PasswordRequireSpecialChar,
            request.SessionTimeoutMinutes,
            request.MaxLoginAttempts,
            request.LockoutMinutes,
            request.DefaultTrialDurationDays,
            request.DefaultMaxUsers,
            request.DefaultMaxExams,
            request.DefaultMaxStudents,
            request.N8nWebhookUrl,
            request.DefaultInAppNotificationsEnabled,
            request.DefaultEmailNotificationsEnabled);

        var result = await _updateHandler.HandleAsync(command, cancellationToken);
        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        return Ok(ToResponse(result.Settings!));
    }

    // Real - sends an actual test payload through the same dispatch path
    // (and, if set, the same DB-configured webhook URL) real account-invite
    // emails use, so a Super Admin can genuinely verify the current Email
    // Settings configuration rather than a fake "Not connected yet" status.
    [HttpPost("test-email")]
    public async Task<IActionResult> SendTestEmail(SendTestEmailRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ToEmail))
        {
            return BadRequest(new { message = "Enter an email address to send the test to." });
        }

        var sent = await _emailDispatcher.SendAsync(
            toEmail: request.ToEmail,
            toName: "Platform Super Admin",
            subject: "ExamVault test email",
            body: "This is a test email sent from Platform Admin > Settings > Email Settings to verify the " +
                  "current webhook configuration.\n\nIf you received this, email delivery is working.",
            cancellationToken: cancellationToken);

        if (!sent)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = "The test email could not be sent. Check the webhook URL and try again." });
        }

        return Ok(new { message = "Test email sent." });
    }

    private static PlatformSettingsResponse ToResponse(PlatformSettingsEntity settings) =>
        new(
            settings.PlatformName,
            settings.PlatformTagline,
            settings.AllowSelfRegistration,
            settings.MaintenanceModeEnabled,
            settings.PasswordMinLength,
            settings.PasswordRequireUppercase,
            settings.PasswordRequireLowercase,
            settings.PasswordRequireDigit,
            settings.PasswordRequireSpecialChar,
            settings.SessionTimeoutMinutes,
            settings.MaxLoginAttempts,
            settings.LockoutMinutes,
            settings.DefaultTrialDurationDays,
            settings.DefaultMaxUsers,
            settings.DefaultMaxExams,
            settings.DefaultMaxStudents,
            settings.N8nWebhookUrl,
            settings.DefaultInAppNotificationsEnabled,
            settings.DefaultEmailNotificationsEnabled,
            settings.UpdatedAtUtc);
}
