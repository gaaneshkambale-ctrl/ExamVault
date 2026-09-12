using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Settings.GetEmailConnectionStatus;
using OnlineExamSystem.User.Application.Settings.GetEmailSummary;
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
    private readonly GetEmailConnectionStatusHandler _connectionStatusHandler;
    private readonly GetEmailSummaryHandler _emailSummaryHandler;
    private readonly IUserRepository _userRepository;

    public PlatformSettingsController(
        GetPlatformSettingsHandler getHandler,
        UpdatePlatformSettingsHandler updateHandler,
        IPlatformSettingsRepository platformSettingsRepository,
        IEmailDispatcher emailDispatcher,
        GetEmailConnectionStatusHandler connectionStatusHandler,
        GetEmailSummaryHandler emailSummaryHandler,
        IUserRepository userRepository)
    {
        _getHandler = getHandler;
        _updateHandler = updateHandler;
        _platformSettingsRepository = platformSettingsRepository;
        _emailDispatcher = emailDispatcher;
        _connectionStatusHandler = connectionStatusHandler;
        _emailSummaryHandler = emailSummaryHandler;
        _userRepository = userRepository;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var settings = await _getHandler.HandleAsync(new GetPlatformSettingsQuery(), cancellationToken);
        var updatedByName = await ActorNameResolver.ResolveOneAsync(_userRepository, settings.UpdatedByUserId, cancellationToken);
        return Ok(ToResponse(settings, updatedByName));
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
        var updatedByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
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
            request.DefaultEmailNotificationsEnabled,
            updatedByUserId);

        var result = await _updateHandler.HandleAsync(command, cancellationToken);
        if (!result.Success)
        {
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        var updatedByName = await ActorNameResolver.ResolveOneAsync(_userRepository, result.Settings!.UpdatedByUserId, cancellationToken);
        return Ok(ToResponse(result.Settings!, updatedByName));
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

    // Real reachability probe (HEAD, never a real send) against the
    // currently configured n8n webhook - see N8nConnectionChecker's own
    // comment for exactly what counts as Reachable vs Unreachable.
    [HttpGet("email-connection-status")]
    public async Task<IActionResult> GetEmailConnectionStatus(CancellationToken cancellationToken)
    {
        var status = await _connectionStatusHandler.HandleAsync(new GetEmailConnectionStatusQuery(), cancellationToken);
        return Ok(new EmailConnectionStatusResponse(status.ToString()));
    }

    // Sums today's send/deliver/fail counts from this service's own
    // credential-email log with NotificationService's separate general-
    // notification log - see GetEmailSummaryHandler's own comment.
    [HttpGet("email-summary")]
    public async Task<IActionResult> GetEmailSummary(CancellationToken cancellationToken)
    {
        var summary = await _emailSummaryHandler.HandleAsync(new GetEmailSummaryQuery(), cancellationToken);
        return Ok(new EmailSummaryResponse(summary.SentToday, summary.DeliveredToday, summary.FailedToday, summary.DeliveryRatePercent));
    }

    private static PlatformSettingsResponse ToResponse(PlatformSettingsEntity settings, string? updatedByName) =>
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
            settings.UpdatedAtUtc,
            settings.UpdatedByUserId,
            updatedByName);
}
