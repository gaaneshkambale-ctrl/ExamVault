using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Notification.Application.SystemLogs.ListSystemErrorLogs;
using OnlineExamSystem.Notification.Application.SystemLogs.RecordSystemErrorLog;
using OnlineExamSystem.Notification.Application.SystemLogs.ResolveSystemErrorLog;
using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Contracts.Requests.Notification;
using OnlineExamSystem.Shared.Contracts.Responses.Notification;

namespace OnlineExamSystem.Notification.API.Controllers;

[ApiController]
[Route("api/system-logs")]
public class SystemLogsController : ControllerBase
{
    private readonly RecordSystemErrorLogHandler _recordHandler;
    private readonly ListSystemErrorLogsHandler _listHandler;
    private readonly ResolveSystemErrorLogHandler _resolveHandler;

    public SystemLogsController(
        RecordSystemErrorLogHandler recordHandler,
        ListSystemErrorLogsHandler listHandler,
        ResolveSystemErrorLogHandler resolveHandler)
    {
        _recordHandler = recordHandler;
        _listHandler = listHandler;
        _resolveHandler = resolveHandler;
    }

    // Deliberately NOT [Authorize]: this write is called service-to-service
    // by every service's own exception-handling middleware (including
    // before any JWT exists, e.g. a login-flow failure), and is reachable
    // only inside the docker network - no Gateway route is registered for
    // this exact path+method, same precedent as RecordAuditLog.
    [HttpPost]
    public async Task<IActionResult> Record(RecordSystemErrorLogRequest request, CancellationToken cancellationToken)
    {
        var command = new RecordSystemErrorLogCommand(
            request.Service,
            Enum.Parse<SystemLogLevel>(request.Severity, ignoreCase: true),
            request.Message,
            request.ExceptionType,
            request.StackTrace,
            request.RequestPath,
            request.RequestMethod,
            request.TenantId);

        await _recordHandler.HandleAsync(command, cancellationToken);
        return NoContent();
    }

    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> List(
        [FromQuery] DateTime fromUtc,
        [FromQuery] DateTime toUtc,
        [FromQuery] string? service,
        [FromQuery] string? severity,
        [FromQuery] bool? isResolved,
        CancellationToken cancellationToken)
    {
        SystemLogLevel? parsedSeverity = string.IsNullOrWhiteSpace(severity)
            ? null
            : Enum.Parse<SystemLogLevel>(severity, ignoreCase: true);

        var items = await _listHandler.HandleAsync(
            new ListSystemErrorLogsQuery(fromUtc, toUtc, service, parsedSeverity, isResolved), cancellationToken);

        return Ok(items.Select(ToResponse).ToList());
    }

    [HttpPost("{id:guid}/resolve")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Resolve(Guid id, CancellationToken cancellationToken)
    {
        var resolvedByUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _resolveHandler.HandleAsync(
            new ResolveSystemErrorLogCommand(id, resolvedByUserId), cancellationToken);

        return result.Found ? NoContent() : NotFound();
    }

    private static SystemErrorLogResponse ToResponse(SystemErrorLog log) => new(
        log.Id,
        log.CreatedAtUtc,
        log.Service,
        log.Severity.ToString(),
        log.Message,
        log.ExceptionType,
        log.StackTrace,
        log.RequestPath,
        log.RequestMethod,
        log.TenantId,
        log.IsResolved,
        log.ResolvedAtUtc,
        log.ResolvedByUserId);
}
