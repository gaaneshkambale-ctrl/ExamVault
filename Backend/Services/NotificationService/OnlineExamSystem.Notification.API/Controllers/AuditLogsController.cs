using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Notification.Application.Audit.Admin.ListAuditLogs;
using OnlineExamSystem.Notification.Application.Audit.RecordAuditLog;
using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Contracts.Requests.Notification;
using OnlineExamSystem.Shared.Contracts.Responses.Notification;
using static OnlineExamSystem.Notification.API.Authorization.FeaturePolicies;
using static OnlineExamSystem.Notification.API.Authorization.PermissionPolicies;

namespace OnlineExamSystem.Notification.API.Controllers;

[ApiController]
[Route("api/audit-logs")]
public class AuditLogsController : ControllerBase
{
    private readonly RecordAuditLogHandler _recordAuditLogHandler;
    private readonly ListAuditLogsHandler _listAuditLogsHandler;

    public AuditLogsController(
        RecordAuditLogHandler recordAuditLogHandler,
        ListAuditLogsHandler listAuditLogsHandler)
    {
        _recordAuditLogHandler = recordAuditLogHandler;
        _listAuditLogsHandler = listAuditLogsHandler;
    }

    // Deliberately NOT [Authorize]: this write is called service-to-service
    // (including from the login flow, before any JWT exists), and is
    // reachable only inside the docker network - no Gateway route is
    // registered for it, so the outside world/browser can never reach this
    // action at all. See ActionPlan.txt "Reports submenu" Phase A for the
    // tradeoff this was weighed against (a shared internal-secret header).
    [HttpPost]
    public async Task<IActionResult> Record(RecordAuditLogRequest request, CancellationToken cancellationToken)
    {
        var command = new RecordAuditLogCommand(
            request.TenantId,
            Enum.Parse<AuditModule>(request.Module, ignoreCase: true),
            request.Activity,
            request.Details,
            request.EntityId,
            request.UserId,
            request.UserName,
            request.IpAddress);

        await _recordAuditLogHandler.HandleAsync(command, cancellationToken);
        return NoContent();
    }

    // SuperAdmin added here (previously Admin-only, flagged as a known
    // follow-up when the Super Admin console was first scoped out -
    // ListAuditLogsHandler's query filter already had the IsSuperAdmin
    // bypass from Phase 2, it was only ever blocked by this role gate).
    // A regular Admin still only ever sees their own tenant's logs
    // through it - the bypass only activates for an actual SuperAdmin
    // claim.
    [HttpGet]
    [Authorize(Roles = "Admin,SuperAdmin")]
    [Authorize(Policy = Reports)]
    [Authorize(Policy = ReportsView)]
    public async Task<IActionResult> List(
        [FromQuery] DateTime fromUtc,
        [FromQuery] DateTime toUtc,
        [FromQuery] string? module,
        [FromQuery] Guid? userId,
        CancellationToken cancellationToken)
    {
        AuditModule? parsedModule = string.IsNullOrWhiteSpace(module)
            ? null
            : Enum.Parse<AuditModule>(module, ignoreCase: true);

        var items = await _listAuditLogsHandler.HandleAsync(
            new ListAuditLogsQuery(fromUtc, toUtc, parsedModule, userId), cancellationToken);

        return Ok(items.Select(ToResponse).ToList());
    }

    // Self-service Activity Log for the Profile page - reuses the same
    // ListAuditLogsHandler the admin view uses, but the UserId filter is
    // forced to the caller's own id here rather than accepted from the
    // client, so a non-admin can never see anyone else's activity.
    [HttpGet("mine")]
    [Authorize]
    public async Task<IActionResult> ListMine(
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] string? module,
        CancellationToken cancellationToken = default)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var resolvedToUtc = toUtc ?? DateTime.UtcNow;
        var resolvedFromUtc = fromUtc ?? resolvedToUtc.AddYears(-1);
        AuditModule? parsedModule = string.IsNullOrWhiteSpace(module)
            ? null
            : Enum.Parse<AuditModule>(module, ignoreCase: true);

        var items = await _listAuditLogsHandler.HandleAsync(
            new ListAuditLogsQuery(resolvedFromUtc, resolvedToUtc, parsedModule, UserId: userId), cancellationToken);

        return Ok(items.Select(ToResponse).ToList());
    }

    private static AuditLogResponse ToResponse(AuditLog log) => new(
        log.Id,
        log.CreatedAtUtc,
        log.Module.ToString(),
        log.Activity,
        log.Details,
        log.EntityId,
        log.UserId,
        log.UserName,
        log.IpAddress,
        log.TenantId);
}
