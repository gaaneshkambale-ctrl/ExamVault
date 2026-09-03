using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.API.Controllers;

// Deliberately routed outside /api so the Gateway's platform-settings-route
// (/api/platform-settings/{**catch-all}) can never proxy it - only another
// backend service calling User API directly on its own port can reach it,
// same pattern as InternalController/InternalTenantsController. Anonymous
// because the caller is NotificationService's GetMyPreferencesHandler, an
// end-user request with no reason to forward that user's own JWT to a
// cross-service call for a platform-wide default; the response is a single
// pair of booleans, nothing sensitive.
[ApiController]
[Route("internal/platform-settings")]
public class InternalPlatformSettingsController : ControllerBase
{
    private readonly IPlatformSettingsRepository _platformSettingsRepository;

    public InternalPlatformSettingsController(IPlatformSettingsRepository platformSettingsRepository)
    {
        _platformSettingsRepository = platformSettingsRepository;
    }

    [HttpGet("notification-defaults")]
    public async Task<IActionResult> NotificationDefaults(CancellationToken cancellationToken)
    {
        var settings = await _platformSettingsRepository.GetAsync(cancellationToken);
        return Ok(new
        {
            defaultInAppEnabled = settings?.DefaultInAppNotificationsEnabled ?? true,
            defaultEmailEnabled = settings?.DefaultEmailNotificationsEnabled ?? true,
        });
    }
}
