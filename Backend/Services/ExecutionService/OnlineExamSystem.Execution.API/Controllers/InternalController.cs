using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Execution.Application.Sql;
using OnlineExamSystem.Shared.Contracts.Requests.Execution;
using OnlineExamSystem.Shared.Contracts.Responses.Execution;

namespace OnlineExamSystem.Execution.API.Controllers;

// Deliberately routed outside /api so the Gateway's execution-route
// (/api/execution/{**catch-all}) can never proxy it - only another backend
// service calling Execution API directly on its own port can reach it. Same
// convention as Question Service's own InternalController.
[ApiController]
[Route("internal/execution")]
public class InternalController : ControllerBase
{
    private readonly ComputeSqlExpectedOutputHandler _computeSqlExpectedOutputHandler;

    public InternalController(ComputeSqlExpectedOutputHandler computeSqlExpectedOutputHandler)
    {
        _computeSqlExpectedOutputHandler = computeSqlExpectedOutputHandler;
    }

    // Called by Question Service when an admin creates/updates a Sql
    // question, to precompute Expected Output for every test case.
    [HttpPost("sql-expected-output")]
    public async Task<IActionResult> ComputeSqlExpectedOutput(
        ComputeSqlExpectedOutputRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ReferenceQuery) || request.SetupSqlList.Count == 0)
        {
            return Ok(new ComputeSqlExpectedOutputResponse(
                request.SetupSqlList
                    .Select(_ => new SqlExpectedOutputItemResponse(false, string.Empty, "No reference query configured."))
                    .ToList()));
        }

        var results = await _computeSqlExpectedOutputHandler.HandleAsync(
            request.ReferenceQuery, request.SetupSqlList, cancellationToken);

        return Ok(new ComputeSqlExpectedOutputResponse(
            results.Select(r => new SqlExpectedOutputItemResponse(r.Success, r.Output, r.Error)).ToList()));
    }
}
