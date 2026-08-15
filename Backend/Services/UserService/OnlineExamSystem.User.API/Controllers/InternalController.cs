using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.User.Application.Users.Internal.GetUsersByIds;

namespace OnlineExamSystem.User.API.Controllers;

// Deliberately routed outside /api so the Gateway's users-route
// (/api/users/{**catch-all}) can never proxy it - only another backend
// service calling User API directly on its own port can reach it, the same
// pattern established for Question Service's internal answer-key endpoint
// (Phase 8). Anonymous rather than [Authorize] because the caller here is an
// unattended background job (Exam Service's reminder check) with no user
// JWT of any kind to forward - network reachability is the only boundary,
// and the response only ever carries Email/FullName for explicitly
// requested ids, never a full user listing.
[ApiController]
[Route("internal/users")]
public class InternalController : ControllerBase
{
    private readonly GetUsersByIdsHandler _getUsersByIdsHandler;

    public InternalController(GetUsersByIdsHandler getUsersByIdsHandler)
    {
        _getUsersByIdsHandler = getUsersByIdsHandler;
    }

    [HttpGet("by-ids")]
    public async Task<IActionResult> ByIds([FromQuery] List<Guid> ids, CancellationToken cancellationToken)
    {
        var users = await _getUsersByIdsHandler.HandleAsync(new GetUsersByIdsQuery(ids), cancellationToken);
        return Ok(users.Select(u => new InternalUserResponse(u.Id, u.Email, u.FullName)));
    }

    private record InternalUserResponse(Guid Id, string Email, string FullName);
}
