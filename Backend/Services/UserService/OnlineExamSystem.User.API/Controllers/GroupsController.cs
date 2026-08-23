using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Shared.Common.Security;
using OnlineExamSystem.Shared.Contracts.Requests.User;
using OnlineExamSystem.Shared.Contracts.Responses.User;
using OnlineExamSystem.User.Application.Groups;
using OnlineExamSystem.User.Application.Groups.AddMember;
using OnlineExamSystem.User.Application.Groups.Create;
using OnlineExamSystem.User.Application.Groups.Delete;
using OnlineExamSystem.User.Application.Groups.GetById;
using OnlineExamSystem.User.Application.Groups.List;
using OnlineExamSystem.User.Application.Groups.RemoveMember;

namespace OnlineExamSystem.User.API.Controllers;

[ApiController]
[Route("api/users/groups")]
[Authorize(Roles = "Admin")]
public class GroupsController : ControllerBase
{
    private readonly CreateGroupHandler _createGroupHandler;
    private readonly ListGroupsHandler _listGroupsHandler;
    private readonly GetGroupHandler _getGroupHandler;
    private readonly DeleteGroupHandler _deleteGroupHandler;
    private readonly AddGroupMemberHandler _addGroupMemberHandler;
    private readonly RemoveGroupMemberHandler _removeGroupMemberHandler;
    private readonly ILogger<GroupsController> _logger;

    public GroupsController(
        CreateGroupHandler createGroupHandler,
        ListGroupsHandler listGroupsHandler,
        GetGroupHandler getGroupHandler,
        DeleteGroupHandler deleteGroupHandler,
        AddGroupMemberHandler addGroupMemberHandler,
        RemoveGroupMemberHandler removeGroupMemberHandler,
        ILogger<GroupsController> logger)
    {
        _createGroupHandler = createGroupHandler;
        _listGroupsHandler = listGroupsHandler;
        _getGroupHandler = getGroupHandler;
        _deleteGroupHandler = deleteGroupHandler;
        _addGroupMemberHandler = addGroupMemberHandler;
        _removeGroupMemberHandler = removeGroupMemberHandler;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateGroupRequest request, CancellationToken cancellationToken)
    {
        var tenantId = Guid.Parse(User.FindFirstValue(TenantClaimTypes.TenantId)!);
        var result = await _createGroupHandler.HandleAsync(new CreateGroupCommand(tenantId, request.Name), cancellationToken);

        if (result.NameAlreadyExists)
        {
            return Conflict(new { message = "A group with this name already exists." });
        }

        if (!result.Success)
        {
            _logger.LogWarning(
                "Create group validation failed: {Errors}",
                string.Join("; ", result.ValidationErrors));
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        var group = result.Group!;
        _logger.LogInformation("Group {GroupId} ({Name}) created.", group.Id, group.Name);
        return StatusCode(StatusCodes.Status201Created, ToResponse(new GroupWithMemberCount(group, 0)));
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var groups = await _listGroupsHandler.HandleAsync(new ListGroupsQuery(), cancellationToken);
        return Ok(groups.Select(ToResponse));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var detail = await _getGroupHandler.HandleAsync(new GetGroupQuery(id), cancellationToken);
        if (detail is null)
        {
            return NotFound(new { message = "Group not found." });
        }

        return Ok(new GroupDetailResponse(detail.Group.Id, detail.Group.Name, detail.Group.CreatedAtUtc, detail.MemberUserIds));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _deleteGroupHandler.HandleAsync(new DeleteGroupCommand(id), cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "Group not found." });
        }

        _logger.LogInformation("Group {GroupId} deleted.", id);
        return NoContent();
    }

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> AddMember(
        Guid id,
        AddGroupMemberRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _addGroupMemberHandler.HandleAsync(
            new AddGroupMemberCommand(id, request.UserId),
            cancellationToken);

        if (result.IsGroupNotFound)
        {
            return NotFound(new { message = "Group not found." });
        }

        if (result.IsUserNotFound)
        {
            return NotFound(new { message = "User not found." });
        }

        if (result.IsNotStudent)
        {
            return Conflict(new { message = "Only students can be added to a group." });
        }

        if (result.IsAlreadyMember)
        {
            return Conflict(new { message = "This user is already a member of the group." });
        }

        _logger.LogInformation("User {UserId} added to group {GroupId}.", request.UserId, id);
        return StatusCode(StatusCodes.Status201Created);
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId, CancellationToken cancellationToken)
    {
        var result = await _removeGroupMemberHandler.HandleAsync(
            new RemoveGroupMemberCommand(id, userId),
            cancellationToken);

        if (result.IsNotFound)
        {
            return NotFound(new { message = "This user is not a member of the group." });
        }

        _logger.LogInformation("User {UserId} removed from group {GroupId}.", userId, id);
        return NoContent();
    }

    private static GroupResponse ToResponse(GroupWithMemberCount group) =>
        new(group.Group.Id, group.Group.Name, group.MemberCount, group.Group.CreatedAtUtc);
}
