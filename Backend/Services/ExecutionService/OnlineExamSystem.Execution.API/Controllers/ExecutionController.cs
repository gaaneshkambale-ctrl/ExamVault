using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;
using OnlineExamSystem.Execution.Application.Run;
using OnlineExamSystem.Execution.Application.Sql;
using OnlineExamSystem.Execution.Domain;
using OnlineExamSystem.Shared.Contracts.Requests.Execution;
using OnlineExamSystem.Shared.Contracts.Responses.Execution;

namespace OnlineExamSystem.Execution.API.Controllers;

[ApiController]
[Route("api/execution")]
[Authorize]
public class ExecutionController : ControllerBase
{
    private readonly RunCodeHandler _runCodeHandler;
    private readonly RunSqlHandler _runSqlHandler;
    private readonly ILogger<ExecutionController> _logger;

    public ExecutionController(
        RunCodeHandler runCodeHandler,
        RunSqlHandler runSqlHandler,
        ILogger<ExecutionController> logger)
    {
        _runCodeHandler = runCodeHandler;
        _runSqlHandler = runSqlHandler;
        _logger = logger;
    }

    // Interactive Run Code, called directly from the student's editor -
    // informational only. The authoritative grading run (Phase 3) calls the
    // same RunCodeHandler independently at submission time; this endpoint
    // never itself assigns marks.
    [HttpPost("run")]
    public async Task<IActionResult> Run(RunCodeRequest request, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<ParameterType>(request.ReturnType, ignoreCase: true, out var returnType))
        {
            return BadRequest(new { message = $"Unknown return type '{request.ReturnType}'." });
        }

        var parameters = new List<FunctionParameter>();
        foreach (var parameter in request.Parameters)
        {
            if (!Enum.TryParse<ParameterType>(parameter.Type, ignoreCase: true, out var parameterType))
            {
                return BadRequest(new { message = $"Unknown parameter type '{parameter.Type}'." });
            }

            parameters.Add(new FunctionParameter(parameter.Name, parameterType));
        }

        var command = new RunCodeCommand(
            request.Language,
            request.StudentCode,
            request.FunctionName,
            parameters,
            returnType,
            request.TestCases.Select(t => new TestCaseInput(t.Arguments, t.ExpectedOutput)).ToList());

        var result = await _runCodeHandler.HandleAsync(command, cancellationToken);

        if (!result.Success)
        {
            _logger.LogWarning("Run Code validation failed: {Errors}", string.Join("; ", result.ValidationErrors));
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        return Ok(new RunCodeResponse(
            result.Outcomes
                .Select(o => new TestCaseOutcomeResponse(o.Passed, o.ActualOutput, o.ExpectedOutput, o.Error))
                .ToList()));
    }

    // Sql questions only. Forwards THIS request's own bearer token to
    // Question Service to fetch the Reference Query + Setup SQL - the
    // browser never sees or sends the reference query itself.
    [HttpPost("run-sql")]
    public async Task<IActionResult> RunSql(RunSqlRequest request, CancellationToken cancellationToken)
    {
        var bearerToken = Request.Headers[HeaderNames.Authorization]
            .ToString()
            .Replace("Bearer ", string.Empty, StringComparison.OrdinalIgnoreCase);

        var command = new RunSqlCommand(request.QuestionId, request.StudentQuery, bearerToken);
        var result = await _runSqlHandler.HandleAsync(command, cancellationToken);

        if (!result.Success)
        {
            _logger.LogWarning("Run Sql validation failed: {Errors}", string.Join("; ", result.ValidationErrors));
            return ValidationProblem(new ValidationProblemDetails(
                result.ValidationErrors
                    .Select((error, index) => (error, index))
                    .GroupBy(_ => "request")
                    .ToDictionary(g => g.Key, g => g.Select(x => x.error).ToArray())));
        }

        return Ok(new RunCodeResponse(
            result.Outcomes
                .Select(o => new TestCaseOutcomeResponse(o.Passed, o.ActualOutput, o.ExpectedOutput, o.Error))
                .ToList()));
    }
}
