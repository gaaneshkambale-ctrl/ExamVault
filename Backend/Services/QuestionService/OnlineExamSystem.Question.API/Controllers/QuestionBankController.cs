using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Application.QuestionBank;
using OnlineExamSystem.Question.Domain.Enums;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.Shared.Contracts.Requests.QuestionBank;
using OnlineExamSystem.Shared.Contracts.Responses.Question;
using OnlineExamSystem.Shared.Contracts.Responses.QuestionBank;
using static OnlineExamSystem.Question.API.Authorization.FeaturePolicies;
using static OnlineExamSystem.Question.API.Authorization.PermissionPolicies;

namespace OnlineExamSystem.Question.API.Controllers;

// The organization's reusable Question Bank. Admin/Instructor only - unlike
// api/questions, students never read from here (exams get COPIES of bank
// questions, so a student never touches the bank or its answer keys).
[ApiController]
[Route("api/question-bank")]
[Authorize(Roles = "Admin,Instructor")]
[Authorize(Policy = Exams)]
public class QuestionBankController : ControllerBase
{
    private readonly QuestionBankService _service;
    private readonly IInternalUserLookupClient _userLookupClient;
    private readonly IAuditClient _auditClient;

    public QuestionBankController(
        QuestionBankService service,
        IInternalUserLookupClient userLookupClient,
        IAuditClient auditClient)
    {
        _service = service;
        _userLookupClient = userLookupClient;
        _auditClient = auditClient;
    }

    // ---- Subjects ----

    [HttpGet("subjects")]
    public async Task<IActionResult> ListSubjects(CancellationToken ct) =>
        Ok((await _service.ListSubjectsAsync(ct)).Select(v =>
            new BankSubjectResponse(v.Subject.Id, v.Subject.Name, v.Subject.Description, v.TopicCount, v.QuestionCount, v.Subject.CreatedAtUtc)));

    [HttpPost("subjects")]
    [Authorize(Policy = QuestionsCreate)]
    public async Task<IActionResult> CreateSubject(SaveBankSubjectRequest request, CancellationToken ct)
    {
        var result = await _service.CreateSubjectAsync(request.Name, request.Description, CallerId, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        var s = result.Value!;
        await AuditAsync(s.TenantId, "Created question bank subject", s.Name, s.Id, ct);
        return StatusCode(StatusCodes.Status201Created, new BankSubjectResponse(s.Id, s.Name, s.Description, 0, 0, s.CreatedAtUtc));
    }

    [HttpPut("subjects/{id:guid}")]
    [Authorize(Policy = QuestionsEdit)]
    public async Task<IActionResult> UpdateSubject(Guid id, SaveBankSubjectRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateSubjectAsync(id, request.Name, request.Description, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        var s = result.Value!;
        await AuditAsync(s.TenantId, "Updated question bank subject", s.Name, s.Id, ct);
        return Ok(new BankSubjectResponse(s.Id, s.Name, s.Description, 0, 0, s.CreatedAtUtc));
    }

    [HttpDelete("subjects/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteSubject(Guid id, CancellationToken ct)
    {
        var result = await _service.DeleteSubjectAsync(id, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        await AuditAsync(result.Value!.TenantId, "Deleted question bank subject", result.Value.Name, id, ct);
        return NoContent();
    }

    // ---- Topics ----

    [HttpGet("topics")]
    public async Task<IActionResult> ListTopics([FromQuery] Guid? subjectId, CancellationToken ct) =>
        Ok((await _service.ListTopicsAsync(subjectId, ct)).Select(v =>
            new BankTopicResponse(v.Topic.Id, v.Topic.SubjectId, v.Topic.Name, v.QuestionCount, v.Topic.CreatedAtUtc)));

    [HttpPost("topics")]
    [Authorize(Policy = QuestionsCreate)]
    public async Task<IActionResult> CreateTopic(SaveBankTopicRequest request, CancellationToken ct)
    {
        var result = await _service.CreateTopicAsync(request.SubjectId, request.Name, CallerId, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        var t = result.Value!;
        await AuditAsync(t.TenantId, "Created question bank topic", t.Name, t.Id, ct);
        return StatusCode(StatusCodes.Status201Created, new BankTopicResponse(t.Id, t.SubjectId, t.Name, 0, t.CreatedAtUtc));
    }

    // Rename only - the subject is fixed once a topic exists.
    [HttpPut("topics/{id:guid}")]
    [Authorize(Policy = QuestionsEdit)]
    public async Task<IActionResult> RenameTopic(Guid id, SaveBankTopicRequest request, CancellationToken ct)
    {
        var result = await _service.RenameTopicAsync(id, request.Name, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        var t = result.Value!;
        await AuditAsync(t.TenantId, "Renamed question bank topic", t.Name, t.Id, ct);
        return Ok(new BankTopicResponse(t.Id, t.SubjectId, t.Name, 0, t.CreatedAtUtc));
    }

    [HttpDelete("topics/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteTopic(Guid id, CancellationToken ct)
    {
        var result = await _service.DeleteTopicAsync(id, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        await AuditAsync(result.Value!.TenantId, "Deleted question bank topic", result.Value.Name, id, ct);
        return NoContent();
    }

    // ---- Tags ----

    [HttpGet("tags")]
    public async Task<IActionResult> ListTags(CancellationToken ct) =>
        Ok((await _service.ListTagsAsync(ct)).Select(v =>
            new BankTagResponse(v.Tag.Id, v.Tag.Name, v.QuestionCount, v.Tag.CreatedAtUtc)));

    [HttpPost("tags")]
    [Authorize(Policy = QuestionsCreate)]
    public async Task<IActionResult> CreateTag(SaveBankTagRequest request, CancellationToken ct)
    {
        var result = await _service.CreateTagAsync(request.Name, CallerId, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        var t = result.Value!;
        await AuditAsync(t.TenantId, "Created question bank tag", t.Name, t.Id, ct);
        return StatusCode(StatusCodes.Status201Created, new BankTagResponse(t.Id, t.Name, 0, t.CreatedAtUtc));
    }

    [HttpDelete("tags/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteTag(Guid id, CancellationToken ct)
    {
        var result = await _service.DeleteTagAsync(id, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        await AuditAsync(result.Value!.TenantId, "Deleted question bank tag", result.Value.Name, id, ct);
        return NoContent();
    }

    // ---- Questions ----

    // mine=true narrows to the caller's own questions ("My Questions") - a
    // convenience filter, not a permission boundary.
    [HttpGet("questions")]
    public async Task<IActionResult> ListQuestions(
        [FromQuery] string? search,
        [FromQuery] Guid? subjectId,
        [FromQuery] Guid? topicId,
        [FromQuery] string? questionType,
        [FromQuery] string? difficulty,
        [FromQuery] string? status,
        [FromQuery] Guid? tagId,
        [FromQuery] bool mine = false,
        [FromQuery] Guid? examId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        if (!TryParseFilter<QuestionType>(questionType, out var type) ||
            !TryParseFilter<QuestionDifficulty>(difficulty, out var diff) ||
            !TryParseFilter<BankQuestionStatus>(status, out var st))
        {
            return BadRequest(new { message = "Invalid questionType, difficulty or status filter." });
        }

        var result = await _service.ListQuestionsAsync(
            new BankQuestionFilter(search, subjectId, topicId, type, diff, st, tagId, mine ? CallerId : null, page, pageSize, examId), ct);
        var (subjects, topics) = await LookupNamesAsync(ct);
        var names = await ResolveNamesAsync(result.Items.Select(i => (Guid?)i.Question.CreatedByUserId), ct);
        var pageSizeUsed = Math.Clamp(pageSize, 1, 100);
        return Ok(new BankQuestionPageResponse(
            result.Items.Select(i => ToResponse(i, subjects, topics, names)).ToList(),
            result.Total,
            Math.Max(1, page),
            pageSizeUsed));
    }

    [HttpGet("questions/{id:guid}")]
    public async Task<IActionResult> GetQuestion(Guid id, CancellationToken ct)
    {
        var aggregate = await _service.GetQuestionAsync(id, ct);
        if (aggregate is null) return NotFound(new { message = "Question not found." });
        var (subjects, topics) = await LookupNamesAsync(ct);
        var names = await ResolveNamesAsync([aggregate.Question.CreatedByUserId], ct);
        return Ok(ToResponse(aggregate, subjects, topics, names));
    }

    [HttpPost("questions")]
    [Authorize(Policy = QuestionsCreate)]
    public async Task<IActionResult> CreateQuestion(SaveBankQuestionRequest request, CancellationToken ct)
    {
        var result = await _service.CreateQuestionAsync(ToCommand(request), Caller, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        var q = result.Value!.Question;
        await AuditAsync(q.TenantId, "Created question bank question", q.QuestionText, q.Id, ct);
        var (subjects, topics) = await LookupNamesAsync(ct);
        var names = await ResolveNamesAsync([q.CreatedByUserId], ct);
        return StatusCode(StatusCodes.Status201Created, ToResponse(result.Value, subjects, topics, names));
    }

    [HttpPut("questions/{id:guid}")]
    [Authorize(Policy = QuestionsEdit)]
    public async Task<IActionResult> UpdateQuestion(Guid id, SaveBankQuestionRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateQuestionAsync(id, ToCommand(request), Caller, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        var q = result.Value!.Question;
        await AuditAsync(q.TenantId, "Updated question bank question", q.QuestionText, q.Id, ct);
        var (subjects, topics) = await LookupNamesAsync(ct);
        var names = await ResolveNamesAsync([q.CreatedByUserId], ct);
        return Ok(ToResponse(result.Value, subjects, topics, names));
    }

    // How many questions each random-draw rule could pick from (Active, matching,
    // not already in the exam) - lets the UI warn before drawing.
    [HttpPost("random-preview")]
    [Authorize(Policy = QuestionsCreate)]
    public async Task<IActionResult> RandomPreview(RandomDrawPreviewRequest request, CancellationToken ct)
    {
        if (!TryParseRules(request.Rules, out var rules, out var ruleError)) return BadRequest(new { message = ruleError });
        var result = await _service.PreviewRandomAsync(request.ExamId, rules, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        return Ok(result.Value!.Select(a => new RandomRuleAvailabilityResponse(a.Requested, a.Available)).ToList());
    }

    // Draws random questions per rule and copies them into the exam as fixed
    // snapshots (same result shape as add-to-exam). All-or-nothing: a rule the
    // bank cannot fill fails the whole draw with a message per short rule.
    [HttpPost("add-random-to-exam")]
    [Authorize(Policy = QuestionsCreate)]
    public async Task<IActionResult> AddRandomToExam(AddRandomBankQuestionsRequest request, CancellationToken ct)
    {
        if (!TryParseRules(request.Rules, out var rules, out var ruleError)) return BadRequest(new { message = ruleError });
        var result = await _service.AddRandomToExamAsync(request.ExamId, request.SectionId, rules, CallerId, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        var value = result.Value!;
        if (value.Added > 0)
        {
            await AuditAsync(
                CallerTenantId,
                "Randomly drew bank questions into exam",
                $"{value.Added} random question(s) added to exam {request.ExamId}",
                request.ExamId,
                ct);
        }
        return Ok(new AddBankQuestionsToExamResponse(
            value.Added,
            value.Skipped.Select(s => new SkippedBankQuestionResponse(s.BankQuestionId, s.Reason)).ToList(),
            value.CreatedQuestionIds));
    }

    // Creates a Draft copy owned by the caller - creating a question, so it
    // needs the create permission (an Instructor may copy a colleague's
    // question; editing the original stays owner/Admin-only).
    [HttpPost("questions/{id:guid}/duplicate")]
    [Authorize(Policy = QuestionsCreate)]
    public async Task<IActionResult> DuplicateQuestion(Guid id, CancellationToken ct)
    {
        var result = await _service.DuplicateQuestionAsync(id, Caller, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        var q = result.Value!.Question;
        await AuditAsync(q.TenantId, "Duplicated question bank question", q.QuestionText, q.Id, ct);
        var (subjects, topics) = await LookupNamesAsync(ct);
        var names = await ResolveNamesAsync([q.CreatedByUserId], ct);
        return StatusCode(StatusCodes.Status201Created, ToResponse(result.Value, subjects, topics, names));
    }

    // Bulk archive / activate / back-to-draft. Per-item ownership is enforced
    // in the service (an Instructor's foreign questions come back as skipped).
    [HttpPost("questions/bulk-status")]
    [Authorize(Policy = QuestionsEdit)]
    public async Task<IActionResult> BulkSetStatus(BulkBankStatusRequest request, CancellationToken ct)
    {
        var result = await _service.SetStatusAsync(request.Ids ?? [], request.Status ?? string.Empty, Caller, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        var value = result.Value!;
        if (value.Updated > 0)
        {
            await AuditAsync(
                CallerTenantId,
                "Changed question bank status in bulk",
                $"{value.Updated} question(s) set to {request.Status}",
                Guid.Empty,
                ct);
        }
        return Ok(new BulkBankStatusResponse(
            value.Updated,
            value.Skipped.Select(s => new SkippedBankStatusChangeResponse(s.BankQuestionId, s.Reason)).ToList()));
    }

    [HttpDelete("questions/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteQuestion(Guid id, CancellationToken ct)
    {
        var result = await _service.DeleteQuestionAsync(id, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        await AuditAsync(result.Value!.TenantId, "Deleted question bank question", result.Value.QuestionText, id, ct);
        return NoContent();
    }

    // Copies bank questions into an exam (optionally straight into a
    // section). Creating exam questions, so it needs the same permission as
    // creating one by hand. The exam id is not looked up here - same as
    // POST api/questions, which Question Service has never validated against
    // Exam Service; tenant scoping still applies to every row written.
    [HttpPost("add-to-exam")]
    [Authorize(Policy = QuestionsCreate)]
    public async Task<IActionResult> AddToExam(AddBankQuestionsToExamRequest request, CancellationToken ct)
    {
        var result = await _service.AddToExamAsync(request.ExamId, request.SectionId, request.BankQuestionIds ?? [], CallerId, ct);
        if (result.Outcome != BankOutcome.Ok) return Problem(result);
        var value = result.Value!;
        if (value.Added > 0)
        {
            await AuditAsync(
                CallerTenantId,
                "Added bank questions to exam",
                $"{value.Added} question(s) added to exam {request.ExamId}",
                request.ExamId,
                ct);
        }
        return Ok(new AddBankQuestionsToExamResponse(
            value.Added,
            value.Skipped.Select(s => new SkippedBankQuestionResponse(s.BankQuestionId, s.Reason)).ToList(),
            value.CreatedQuestionIds));
    }

    // ---- helpers ----

    private Guid CallerId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private BankCaller Caller => new(CallerId, User.IsInRole("Admin"));

    private Guid CallerTenantId => Guid.Parse(User.FindFirstValue(TenantClaimTypes.TenantId)!);

    private Task AuditAsync(Guid tenantId, string activity, string? details, Guid entityId, CancellationToken ct) =>
        _auditClient.RecordAsync(
            tenantId,
            "Question Bank",
            activity,
            details,
            entityId.ToString(),
            CallerId,
            User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.Email),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            ct);

    // Creator display names are decoration: if User Service is down the
    // response just omits them instead of failing (or, after a write,
    // reporting an error for something that already succeeded).
    private async Task<Dictionary<Guid, string>> ResolveNamesAsync(IEnumerable<Guid?> actorIds, CancellationToken ct)
    {
        try
        {
            return await ActorNameResolver.ResolveAsync(_userLookupClient, actorIds, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            return new Dictionary<Guid, string>();
        }
    }

    private async Task<(Dictionary<Guid, string> Subjects, Dictionary<Guid, string> Topics)> LookupNamesAsync(CancellationToken ct)
    {
        var subjects = (await _service.ListSubjectsAsync(ct)).ToDictionary(v => v.Subject.Id, v => v.Subject.Name);
        var topics = (await _service.ListTopicsAsync(null, ct)).ToDictionary(v => v.Topic.Id, v => v.Topic.Name);
        return (subjects, topics);
    }

    private static BankQuestionResponse ToResponse(
        BankQuestionAggregate a,
        Dictionary<Guid, string> subjects,
        Dictionary<Guid, string> topics,
        Dictionary<Guid, string> creatorNames)
    {
        var q = a.Question;
        var spec = BankCodeSpec.FromJson(q.CodeSpecJson);
        return new BankQuestionResponse(
            q.Id,
            q.SubjectId,
            subjects.GetValueOrDefault(q.SubjectId, string.Empty),
            q.TopicId,
            q.TopicId is { } topicId ? topics.GetValueOrDefault(topicId) : null,
            q.QuestionType.ToString(),
            q.QuestionText,
            q.Explanation,
            q.Difficulty.ToString(),
            q.DefaultMarks,
            q.NegativeMarks,
            q.ShuffleOptions,
            q.Status.ToString(),
            a.Options.Select(o => new BankQuestionOptionResponse(o.Id, o.OptionText, o.IsCorrect, o.DisplayOrder)).ToList(),
            a.Tags.Select(t => new BankTagResponse(t.Id, t.Name, 0, t.CreatedAtUtc)).ToList(),
            q.CreatedByUserId,
            creatorNames.GetValueOrDefault(q.CreatedByUserId),
            q.CreatedAtUtc,
            q.UpdatedByUserId,
            q.UpdatedAtUtc,
            a.UsageCount,
            a.InExam,
            spec?.StarterCode,
            spec?.ProgrammingLanguage,
            spec?.AllowLanguageChange ?? false,
            spec?.SampleAnswer,
            spec?.FunctionName,
            spec?.ReturnType,
            spec?.Parameters.Select((p, i) => new QuestionParameterResponse(p.Name, p.Type, i)).ToList(),
            spec?.TestCases.Select((t, i) => new QuestionTestCaseResponse(
                JsonSerializer.Deserialize<List<JsonElement>>(t.ArgumentsJson)!,
                JsonSerializer.Deserialize<JsonElement>(t.ExpectedOutputJson),
                i)).ToList(),
            spec?.SqlTestCases.Select((t, i) => new QuestionSqlTestCaseResponse(t.SetupSql, i, t.ExpectedOutput)).ToList(),
            spec?.SampleInput,
            spec?.SampleOutput,
            spec?.Constraints);
    }

    // Forwarded to Execution Service to precompute Sql expected output as this same caller.
    private string GetBearerToken() =>
        Request.Headers.Authorization.ToString().Replace("Bearer ", string.Empty, StringComparison.OrdinalIgnoreCase);

    private SaveBankQuestionCommand ToCommand(SaveBankQuestionRequest r) =>
        new(
            r.SubjectId,
            r.TopicId,
            r.QuestionType,
            r.QuestionText ?? string.Empty,
            r.Explanation,
            r.Difficulty,
            r.DefaultMarks,
            r.NegativeMarks,
            r.ShuffleOptions,
            r.Status,
            (r.Options ?? []).Select(o => new BankOptionInput(o.OptionText ?? string.Empty, o.IsCorrect)).ToList(),
            r.TagIds ?? [],
            ToCodeSpec(r),
            GetBearerToken());

    // Only built when the request actually carries code details; the service
    // rejects code details on a non-code type and requires them on a code type.
    private static BankCodeSpec? ToCodeSpec(SaveBankQuestionRequest r)
    {
        var hasCode = r.QuestionType == "CodeProgram"
            || r.ProgrammingLanguage is not null || r.StarterCode is not null || r.SampleAnswer is not null
            || r.FunctionName is not null || r.Parameters is { Count: > 0 } || r.TestCases is { Count: > 0 }
            || r.SqlTestCases is { Count: > 0 };
        if (!hasCode) return null;

        return new BankCodeSpec(
            r.ProgrammingLanguage,
            r.StarterCode,
            r.AllowLanguageChange,
            r.SampleAnswer,
            r.FunctionName,
            r.ReturnType,
            r.SampleInput,
            r.SampleOutput,
            r.Constraints,
            (r.Parameters ?? []).Select(p => new BankCodeParameter(p.Name, p.Type)).ToList(),
            (r.TestCases ?? []).Select(t => new BankCodeTestCase(
                "[" + string.Join(",", t.Arguments.Select(a => a.GetRawText())) + "]",
                t.ExpectedOutput.GetRawText())).ToList(),
            (r.SqlTestCases ?? []).Select(t => new BankCodeSqlTestCase(t.SetupSql, null)).ToList());
    }

    private static bool TryParseRules(
        IReadOnlyList<RandomDrawRuleRequest>? requests, out IReadOnlyList<RandomDrawRule> rules, out string error)
    {
        var parsed = new List<RandomDrawRule>();
        rules = parsed;
        error = string.Empty;
        for (var i = 0; i < (requests?.Count ?? 0); i++)
        {
            var r = requests![i];
            if (!TryParseFilter<QuestionType>(r.QuestionType, out var type) ||
                !TryParseFilter<QuestionDifficulty>(r.Difficulty, out var difficulty))
            {
                error = $"Rule {i + 1}: invalid question type or difficulty.";
                return false;
            }
            parsed.Add(new RandomDrawRule(r.SubjectId, r.TopicId, type, difficulty, r.Count));
        }
        return true;
    }

    private static bool TryParseFilter<TEnum>(string? value, out TEnum? parsed) where TEnum : struct, Enum
    {
        parsed = null;
        if (string.IsNullOrWhiteSpace(value)) return true;
        if (Enum.TryParse<TEnum>(value, ignoreCase: true, out var result) && Enum.IsDefined(result))
        {
            parsed = result;
            return true;
        }
        return false;
    }

    private IActionResult Problem<T>(BankResult<T> result) => result.Outcome switch
    {
        BankOutcome.NotFound => NotFound(new { message = "Not found." }),
        BankOutcome.Forbidden => StatusCode(StatusCodes.Status403Forbidden, new { message = "You can only edit questions you created." }),
        BankOutcome.Conflict => Conflict(new { message = result.Errors![0] }),
        _ => ValidationProblem(new ValidationProblemDetails(
            new Dictionary<string, string[]> { ["request"] = (result.Errors ?? []).ToArray() })),
    };
}
