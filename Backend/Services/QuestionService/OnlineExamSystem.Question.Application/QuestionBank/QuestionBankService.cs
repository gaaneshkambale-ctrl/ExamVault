using System.Text.Json;
using FluentValidation;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Application.Questions;
using OnlineExamSystem.Question.Application.Questions.Create;
using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Question.Domain.Enums;

namespace OnlineExamSystem.Question.Application.QuestionBank;

public class QuestionBankService
{
    private const int MaxPageSize = 100;
    private readonly IQuestionBankRepository _repo;
    private readonly IValidator<SaveBankQuestionCommand> _validator;
    // The exam-question rules (language, function signature, test-case shapes, Sql reference
    // query) are reused verbatim for Code/Programming bank questions so the two can never drift.
    private readonly IValidator<CreateQuestionCommand> _codeValidator;
    private readonly ISqlExpectedOutputClient _sqlClient;
    private readonly ILogger<QuestionBankService> _logger;

    public QuestionBankService(
        IQuestionBankRepository repo,
        IValidator<SaveBankQuestionCommand> validator,
        IValidator<CreateQuestionCommand> codeValidator,
        ISqlExpectedOutputClient sqlClient,
        ILogger<QuestionBankService> logger)
    {
        _repo = repo;
        _validator = validator;
        _codeValidator = codeValidator;
        _sqlClient = sqlClient;
        _logger = logger;
    }

    // ---- Subjects ----

    public async Task<IReadOnlyList<BankSubjectView>> ListSubjectsAsync(CancellationToken ct) =>
        (await _repo.ListSubjectsAsync(ct)).Select(x => new BankSubjectView(x.Subject, x.TopicCount, x.QuestionCount)).ToList();

    public async Task<BankResult<BankSubject>> CreateSubjectAsync(string name, string? description, Guid userId, CancellationToken ct)
    {
        var errors = ValidateName(name, description);
        if (errors.Count > 0) return BankResult<BankSubject>.Invalid(errors);
        name = name.Trim();
        if (await _repo.SubjectNameExistsAsync(name, null, ct)) return BankResult<BankSubject>.Conflict("A subject with this name already exists.");

        var subject = new BankSubject { Name = name, Description = description?.Trim(), CreatedByUserId = userId };
        await _repo.AddSubjectAsync(subject, ct);
        await _repo.SaveChangesAsync(ct);
        return BankResult<BankSubject>.Ok(subject);
    }

    public async Task<BankResult<BankSubject>> UpdateSubjectAsync(Guid id, string name, string? description, CancellationToken ct)
    {
        var subject = await _repo.GetSubjectAsync(id, ct);
        if (subject is null) return BankResult<BankSubject>.NotFound();
        var errors = ValidateName(name, description);
        if (errors.Count > 0) return BankResult<BankSubject>.Invalid(errors);
        name = name.Trim();
        if (await _repo.SubjectNameExistsAsync(name, id, ct)) return BankResult<BankSubject>.Conflict("A subject with this name already exists.");

        subject.Name = name;
        subject.Description = description?.Trim();
        await _repo.SaveChangesAsync(ct);
        return BankResult<BankSubject>.Ok(subject);
    }

    public async Task<BankResult<BankSubject>> DeleteSubjectAsync(Guid id, CancellationToken ct)
    {
        var subject = await _repo.GetSubjectAsync(id, ct);
        if (subject is null) return BankResult<BankSubject>.NotFound();
        if (await _repo.SubjectHasDependentsAsync(id, ct))
            return BankResult<BankSubject>.Conflict("This subject still has topics or questions. Move or delete them first.");
        _repo.RemoveSubject(subject);
        await _repo.SaveChangesAsync(ct);
        return BankResult<BankSubject>.Ok(subject);
    }

    // ---- Topics ----

    public async Task<IReadOnlyList<BankTopicView>> ListTopicsAsync(Guid? subjectId, CancellationToken ct) =>
        (await _repo.ListTopicsAsync(subjectId, ct)).Select(x => new BankTopicView(x.Topic, x.QuestionCount)).ToList();

    public async Task<BankResult<BankTopic>> CreateTopicAsync(Guid subjectId, string name, Guid userId, CancellationToken ct)
    {
        var errors = ValidateName(name, null);
        if (errors.Count > 0) return BankResult<BankTopic>.Invalid(errors);
        if (await _repo.GetSubjectAsync(subjectId, ct) is null) return BankResult<BankTopic>.Invalid(["Subject not found."]);
        name = name.Trim();
        if (await _repo.TopicNameExistsAsync(subjectId, name, null, ct)) return BankResult<BankTopic>.Conflict("This subject already has a topic with this name.");

        var topic = new BankTopic { SubjectId = subjectId, Name = name, CreatedByUserId = userId };
        await _repo.AddTopicAsync(topic, ct);
        await _repo.SaveChangesAsync(ct);
        return BankResult<BankTopic>.Ok(topic);
    }

    // A topic's subject never changes - questions reference both, so moving
    // a topic would silently mis-file every question under it.
    public async Task<BankResult<BankTopic>> RenameTopicAsync(Guid id, string name, CancellationToken ct)
    {
        var topic = await _repo.GetTopicAsync(id, ct);
        if (topic is null) return BankResult<BankTopic>.NotFound();
        var errors = ValidateName(name, null);
        if (errors.Count > 0) return BankResult<BankTopic>.Invalid(errors);
        name = name.Trim();
        if (await _repo.TopicNameExistsAsync(topic.SubjectId, name, id, ct)) return BankResult<BankTopic>.Conflict("This subject already has a topic with this name.");
        topic.Name = name;
        await _repo.SaveChangesAsync(ct);
        return BankResult<BankTopic>.Ok(topic);
    }

    public async Task<BankResult<BankTopic>> DeleteTopicAsync(Guid id, CancellationToken ct)
    {
        var topic = await _repo.GetTopicAsync(id, ct);
        if (topic is null) return BankResult<BankTopic>.NotFound();
        if (await _repo.TopicHasQuestionsAsync(id, ct)) return BankResult<BankTopic>.Conflict("This topic still has questions. Move or delete them first.");
        _repo.RemoveTopic(topic);
        await _repo.SaveChangesAsync(ct);
        return BankResult<BankTopic>.Ok(topic);
    }

    // ---- Tags ----

    public async Task<IReadOnlyList<BankTagView>> ListTagsAsync(CancellationToken ct) =>
        (await _repo.ListTagsAsync(ct)).Select(x => new BankTagView(x.Tag, x.QuestionCount)).ToList();

    public async Task<BankResult<BankTag>> CreateTagAsync(string name, Guid userId, CancellationToken ct)
    {
        var errors = ValidateName(name, null);
        if (errors.Count > 0) return BankResult<BankTag>.Invalid(errors);
        name = name.Trim();
        if (await _repo.TagNameExistsAsync(name, ct)) return BankResult<BankTag>.Conflict("A tag with this name already exists.");
        var tag = new BankTag { Name = name, CreatedByUserId = userId };
        await _repo.AddTagAsync(tag, ct);
        await _repo.SaveChangesAsync(ct);
        return BankResult<BankTag>.Ok(tag);
    }

    // Deleting a tag just unlinks it from questions.
    public async Task<BankResult<BankTag>> DeleteTagAsync(Guid id, CancellationToken ct)
    {
        var tag = await _repo.GetTagAsync(id, ct);
        if (tag is null) return BankResult<BankTag>.NotFound();
        await _repo.RemoveTagAsync(tag, ct);
        await _repo.SaveChangesAsync(ct);
        return BankResult<BankTag>.Ok(tag);
    }

    // ---- Questions ----

    public async Task<BankQuestionPage> ListQuestionsAsync(BankQuestionFilter filter, CancellationToken ct) =>
        await _repo.ListQuestionsAsync(
            filter with { Page = Math.Max(1, filter.Page), PageSize = Math.Clamp(filter.PageSize, 1, MaxPageSize) }, ct);

    public async Task<BankQuestionAggregate?> GetQuestionAsync(Guid id, CancellationToken ct) =>
        await _repo.GetQuestionAggregateAsync(id, ct);

    public async Task<BankResult<BankQuestionAggregate>> CreateQuestionAsync(
        SaveBankQuestionCommand command, BankCaller caller, CancellationToken ct)
    {
        var invalid = await ValidateQuestionAsync(command, ct);
        if (invalid is not null) return BankResult<BankQuestionAggregate>.Invalid(invalid);

        var question = new BankQuestion { CreatedByUserId = caller.UserId };
        Apply(question, command);
        await ApplyCodeAsync(question, command, ct);
        await _repo.AddQuestionAsync(question, BuildOptions(question.Id, command), command.TagIds.Distinct().ToList(), ct);
        await _repo.SaveChangesAsync(ct);
        return BankResult<BankQuestionAggregate>.Ok((await _repo.GetQuestionAggregateAsync(question.Id, ct))!);
    }

    public async Task<BankResult<BankQuestionAggregate>> UpdateQuestionAsync(
        Guid id, SaveBankQuestionCommand command, BankCaller caller, CancellationToken ct)
    {
        var question = await _repo.GetQuestionAsync(id, ct);
        if (question is null) return BankResult<BankQuestionAggregate>.NotFound();
        if (!caller.IsAdmin && question.CreatedByUserId != caller.UserId) return BankResult<BankQuestionAggregate>.Forbidden();

        var invalid = await ValidateQuestionAsync(command, ct);
        if (invalid is not null) return BankResult<BankQuestionAggregate>.Invalid(invalid);

        Apply(question, command);
        await ApplyCodeAsync(question, command, ct);
        question.UpdatedByUserId = caller.UserId;
        question.UpdatedAtUtc = DateTime.UtcNow;
        await _repo.ReplaceQuestionChildrenAsync(id, BuildOptions(id, command), command.TagIds.Distinct().ToList(), ct);
        await _repo.SaveChangesAsync(ct);
        return BankResult<BankQuestionAggregate>.Ok((await _repo.GetQuestionAggregateAsync(id, ct))!);
    }

    // ---- Random draw ----

    public const int MaxRandomRules = 10;

    private static List<string> ValidateRandomRules(Guid examId, IReadOnlyList<RandomDrawRule> rules)
    {
        var errors = new List<string>();
        if (examId == Guid.Empty) errors.Add("Exam is required.");
        if (rules.Count == 0) errors.Add("Add at least one rule.");
        if (rules.Count > MaxRandomRules) errors.Add($"Use at most {MaxRandomRules} rules.");
        for (var i = 0; i < rules.Count; i++)
        {
            if (rules[i].SubjectId == Guid.Empty) errors.Add($"Rule {i + 1}: choose a subject.");
            if (rules[i].Count < 1) errors.Add($"Rule {i + 1}: the number of questions must be at least 1.");
        }
        if (rules.Sum(r => (long)r.Count) > MaxAddToExamBatch)
            errors.Add($"You can draw at most {MaxAddToExamBatch} questions at a time.");
        return errors;
    }

    // How many matching ACTIVE bank questions (not already in the exam) each rule
    // could draw from. Each rule is counted on its own; if two rules overlap, the
    // real draw may still come up short (it hands out each question only once).
    public async Task<BankResult<IReadOnlyList<RandomRuleAvailability>>> PreviewRandomAsync(
        Guid examId, IReadOnlyList<RandomDrawRule> rules, CancellationToken ct)
    {
        var errors = ValidateRandomRules(examId, rules);
        if (errors.Count > 0) return BankResult<IReadOnlyList<RandomRuleAvailability>>.Invalid(errors);

        var result = new List<RandomRuleAvailability>();
        foreach (var rule in rules)
        {
            var candidates = await _repo.GetRandomCandidateIdsAsync(examId, rule.SubjectId, rule.TopicId, rule.QuestionType, rule.Difficulty, ct);
            result.Add(new RandomRuleAvailability(rule.Count, candidates.Count));
        }
        return BankResult<IReadOnlyList<RandomRuleAvailability>>.Ok(result);
    }

    // Draws the requested number of random questions per rule and copies them into
    // the exam (through the same copy path as a hand-picked add, so each one becomes
    // a fixed ExamQuestion snapshot - the exam does not re-draw). All-or-nothing: if
    // ANY rule cannot be filled, nothing is added and every shortfall is reported.
    public async Task<BankResult<AddToExamResult>> AddRandomToExamAsync(
        Guid examId, Guid? sectionId, IReadOnlyList<RandomDrawRule> rules, Guid userId, CancellationToken ct)
    {
        var errors = ValidateRandomRules(examId, rules);
        if (errors.Count > 0) return BankResult<AddToExamResult>.Invalid(errors);

        var picked = new List<Guid>();
        var pickedSet = new HashSet<Guid>();
        for (var i = 0; i < rules.Count; i++)
        {
            var rule = rules[i];
            if (await _repo.GetSubjectAsync(rule.SubjectId, ct) is null)
            {
                errors.Add($"Rule {i + 1}: subject not found.");
                continue;
            }

            var candidates = (await _repo.GetRandomCandidateIdsAsync(examId, rule.SubjectId, rule.TopicId, rule.QuestionType, rule.Difficulty, ct))
                .Where(id => !pickedSet.Contains(id))
                .ToList();
            if (candidates.Count < rule.Count)
            {
                errors.Add($"Rule {i + 1}: only {candidates.Count} matching Active question(s) available, {rule.Count} requested.");
                continue;
            }

            Shuffle(candidates);
            foreach (var id in candidates.Take(rule.Count))
            {
                picked.Add(id);
                pickedSet.Add(id);
            }
        }

        if (errors.Count > 0) return BankResult<AddToExamResult>.Invalid(errors);
        return await AddToExamAsync(examId, sectionId, picked, userId, ct);
    }

    private static void Shuffle<T>(IList<T> list)
    {
        for (var i = list.Count - 1; i > 0; i--)
        {
            var j = Random.Shared.Next(i + 1);
            (list[i], list[j]) = (list[j], list[i]);
        }
    }

    private const string CopySuffix = " (copy)";

    // A fresh Draft copy owned by the caller (so an Instructor can start from a
    // colleague's question and edit their own version): same content, options,
    // tags and code details, but never Active - a copy has to be reviewed before
    // it can be added to an exam. Sql expected output is carried over as-is.
    public async Task<BankResult<BankQuestionAggregate>> DuplicateQuestionAsync(Guid id, BankCaller caller, CancellationToken ct)
    {
        var source = await _repo.GetQuestionAggregateAsync(id, ct);
        if (source is null) return BankResult<BankQuestionAggregate>.NotFound();

        var s = source.Question;
        var text = s.QuestionText.Length + CopySuffix.Length <= 2000
            ? s.QuestionText + CopySuffix
            : s.QuestionText[..(2000 - CopySuffix.Length)] + CopySuffix;
        var copy = new BankQuestion
        {
            SubjectId = s.SubjectId,
            TopicId = s.TopicId,
            QuestionType = s.QuestionType,
            QuestionText = text,
            Explanation = s.Explanation,
            Difficulty = s.Difficulty,
            DefaultMarks = s.DefaultMarks,
            NegativeMarks = s.NegativeMarks,
            ShuffleOptions = s.ShuffleOptions,
            Status = BankQuestionStatus.Draft,
            CodeSpecJson = s.CodeSpecJson,
            CreatedByUserId = caller.UserId,
        };
        var options = source.Options.Select(o => new BankQuestionOption
        {
            QuestionId = copy.Id,
            OptionText = o.OptionText,
            IsCorrect = o.IsCorrect,
            DisplayOrder = o.DisplayOrder,
        }).ToList();

        await _repo.AddQuestionAsync(copy, options, source.Tags.Select(t => t.Id).ToList(), ct);
        await _repo.SaveChangesAsync(ct);
        return BankResult<BankQuestionAggregate>.Ok((await _repo.GetQuestionAggregateAsync(copy.Id, ct))!);
    }

    public const int MaxBulkBatch = 100;

    // Archive / activate / send back to draft many questions at once. Per-item
    // rules match single edits: an Instructor can only change their own
    // questions; the rest are skipped with a reason (not a failure of the batch).
    public async Task<BankResult<BulkStatusResult>> SetStatusAsync(
        IReadOnlyCollection<Guid> ids, string status, BankCaller caller, CancellationToken ct)
    {
        if (!Enum.TryParse<BankQuestionStatus>(status, ignoreCase: true, out var newStatus) || !Enum.IsDefined(newStatus))
            return BankResult<BulkStatusResult>.Invalid(["Status must be Draft, Active or Archived."]);
        var distinct = ids.Distinct().ToList();
        if (distinct.Count == 0) return BankResult<BulkStatusResult>.Invalid(["Select at least one question."]);
        if (distinct.Count > MaxBulkBatch)
            return BankResult<BulkStatusResult>.Invalid([$"You can change at most {MaxBulkBatch} questions at a time."]);

        var found = (await _repo.GetQuestionsByIdsAsync(distinct, ct)).ToDictionary(q => q.Id);
        var skipped = new List<SkippedBankStatusChange>();
        var updated = 0;
        foreach (var id in distinct)
        {
            if (!found.TryGetValue(id, out var q))
            {
                skipped.Add(new SkippedBankStatusChange(id, "Not found."));
            }
            else if (!caller.IsAdmin && q.CreatedByUserId != caller.UserId)
            {
                skipped.Add(new SkippedBankStatusChange(id, "You can only change questions you created."));
            }
            else
            {
                q.Status = newStatus;
                q.UpdatedByUserId = caller.UserId;
                q.UpdatedAtUtc = DateTime.UtcNow;
                updated++;
            }
        }

        if (updated > 0) await _repo.SaveChangesAsync(ct);
        return BankResult<BulkStatusResult>.Ok(new BulkStatusResult(updated, skipped));
    }

    public async Task<BankResult<BankQuestion>> DeleteQuestionAsync(Guid id, CancellationToken ct)
    {
        var question = await _repo.GetQuestionAsync(id, ct);
        if (question is null) return BankResult<BankQuestion>.NotFound();
        _repo.RemoveQuestion(question);
        await _repo.SaveChangesAsync(ct);
        return BankResult<BankQuestion>.Ok(question);
    }


    // ---- Add to exam ----

    public const int MaxAddToExamBatch = 100;

    // Copies bank questions into an exam as ExamQuestion rows (with their
    // options). A COPY, never a link: later bank edits/deletes don't touch the
    // exam. Only Active questions are addable, and a bank question already
    // copied into this exam is skipped rather than duplicated.
    public async Task<BankResult<AddToExamResult>> AddToExamAsync(
        Guid examId, Guid? sectionId, IReadOnlyCollection<Guid> bankQuestionIds, Guid userId, CancellationToken ct)
    {
        var ids = bankQuestionIds.Distinct().ToList();
        if (examId == Guid.Empty) return BankResult<AddToExamResult>.Invalid(["Exam is required."]);
        if (ids.Count == 0) return BankResult<AddToExamResult>.Invalid(["Select at least one question."]);
        if (ids.Count > MaxAddToExamBatch)
            return BankResult<AddToExamResult>.Invalid([$"You can add at most {MaxAddToExamBatch} questions at a time."]);

        var found = (await _repo.GetAggregatesByIdsAsync(ids, ct)).ToDictionary(a => a.Question.Id);
        var already = await _repo.GetBankIdsAlreadyInExamAsync(examId, ids, ct);

        var skipped = new List<SkippedBankQuestion>();
        var copies = new List<ExamCopy>();
        foreach (var id in ids)
        {
            if (!found.TryGetValue(id, out var source))
            {
                skipped.Add(new SkippedBankQuestion(id, "Not found."));
            }
            else if (source.Question.Status != BankQuestionStatus.Active)
            {
                skipped.Add(new SkippedBankQuestion(id, "Only Active questions can be added to an exam."));
            }
            else if (already.Contains(id))
            {
                skipped.Add(new SkippedBankQuestion(id, "Already in this exam."));
            }
            else
            {
                var q = source.Question;
                var copy = new ExamQuestion
                {
                    ExamId = examId,
                    SectionId = sectionId,
                    QuestionType = q.QuestionType,
                    QuestionText = q.QuestionText,
                    Marks = q.DefaultMarks,
                    Difficulty = q.Difficulty,
                    ShuffleOptions = q.ShuffleOptions,
                    CreatedByUserId = userId,
                    SourceBankQuestionId = q.Id,
                    // 0 on a bank question means "none set" - only a positive value overrides
                    // the section/exam negative-marking setting on the exam copy.
                    NegativeMarks = q.NegativeMarks > 0 ? q.NegativeMarks : null,
                };
                var options = source.Options.Select(o => new QuestionOption
                {
                    QuestionId = copy.Id,
                    OptionText = o.OptionText,
                    IsCorrect = o.IsCorrect,
                    DisplayOrder = o.DisplayOrder,
                }).ToList();
                var spec = BankCodeSpec.FromJson(q.CodeSpecJson);
                if (spec is not null)
                {
                    copy.StarterCode = spec.StarterCode;
                    copy.ProgrammingLanguage = spec.ProgrammingLanguage;
                    copy.AllowLanguageChange = spec.AllowLanguageChange;
                    copy.SampleAnswer = spec.SampleAnswer;
                    copy.FunctionName = spec.FunctionName;
                    copy.ReturnType = spec.ReturnType is null ? null : Enum.Parse<ParameterType>(spec.ReturnType, ignoreCase: true);
                    copy.SampleInput = spec.SampleInput;
                    copy.SampleOutput = spec.SampleOutput;
                    copy.Constraints = spec.Constraints;
                }

                var parameters = (spec?.Parameters ?? []).Select((p, i) => new QuestionParameter
                {
                    QuestionId = copy.Id,
                    Name = p.Name,
                    Type = Enum.Parse<ParameterType>(p.Type, ignoreCase: true),
                    DisplayOrder = i,
                }).ToList();
                var testCases = (spec?.TestCases ?? []).Select((t, i) => new QuestionTestCase
                {
                    QuestionId = copy.Id,
                    ArgumentsJson = t.ArgumentsJson,
                    ExpectedOutputJson = t.ExpectedOutputJson,
                    DisplayOrder = i,
                }).ToList();
                var sqlCases = (spec?.SqlTestCases ?? []).Select((t, i) => new QuestionSqlTestCase
                {
                    QuestionId = copy.Id,
                    SetupSql = t.SetupSql,
                    ExpectedOutput = t.ExpectedOutput,
                    DisplayOrder = i,
                }).ToList();
                copies.Add(new ExamCopy(copy, options, parameters, testCases, sqlCases));
            }
        }

        if (copies.Count > 0)
        {
            await _repo.AddExamCopiesAsync(copies, ct);
            await _repo.SaveChangesAsync(ct);
        }

        return BankResult<AddToExamResult>.Ok(new AddToExamResult(copies.Count, skipped, copies.Select(c => c.Question.Id).ToList()));
    }

    // ---- helpers ----

    private async Task<IReadOnlyList<string>?> ValidateQuestionAsync(SaveBankQuestionCommand command, CancellationToken ct)
    {
        var result = await _validator.ValidateAsync(command, ct);
        if (!result.IsValid) return result.Errors.Select(e => e.ErrorMessage).Distinct().ToList();

        var codeErrors = await ValidateCodeAsync(command, ct);
        if (codeErrors.Count > 0) return codeErrors;

        var errors = new List<string>();
        if (await _repo.GetSubjectAsync(command.SubjectId, ct) is null)
        {
            errors.Add("Subject not found.");
        }
        else if (command.TopicId is { } topicId)
        {
            var topic = await _repo.GetTopicAsync(topicId, ct);
            if (topic is null || topic.SubjectId != command.SubjectId) errors.Add("Topic not found under the selected subject.");
        }

        var tagIds = command.TagIds.Distinct().ToList();
        if (tagIds.Count > 0 && await _repo.CountExistingTagsAsync(tagIds, ct) != tagIds.Count) errors.Add("One or more tags were not found.");
        return errors.Count > 0 ? errors : null;
    }

    private async Task<List<string>> ValidateCodeAsync(SaveBankQuestionCommand c, CancellationToken ct)
    {
        var isCode = c.QuestionType == "CodeProgram";
        if (!isCode)
        {
            return c.Code is null ? [] : ["Only Code/Programming questions carry code details."];
        }

        if (c.Code is null) return ["Code/Programming questions need a programming language and code details."];
        if (c.Options.Count > 0) return ["Code/Programming questions don't use options."];
        if (c.Code.ToJson().Length > BankCodeSpec.MaxJsonLength) return ["The code details are too large."];

        var code = c.Code;
        var result = await _codeValidator.ValidateAsync(
            new CreateQuestionCommand(
                Guid.NewGuid(),
                c.QuestionType,
                c.QuestionText,
                c.DefaultMarks,
                c.Difficulty,
                [],
                Guid.Empty,
                false,
                code.StarterCode,
                code.ProgrammingLanguage,
                code.AllowLanguageChange,
                code.SampleAnswer,
                code.FunctionName,
                code.ReturnType,
                code.Parameters.Select(p => new QuestionParameterInput(p.Name, p.Type)).ToList(),
                code.TestCases.Select(t => new QuestionTestCaseInput(SplitArguments(t.ArgumentsJson), t.ExpectedOutputJson)).ToList(),
                code.SqlTestCases.Select(t => new QuestionSqlTestCaseInput(t.SetupSql)).ToList(),
                code.SampleInput,
                code.SampleOutput,
                code.Constraints),
            ct);
        return result.IsValid ? [] : result.Errors.Select(e => e.ErrorMessage).Distinct().ToList();
    }

    private static List<string> SplitArguments(string argumentsJson) =>
        JsonSerializer.Deserialize<List<JsonElement>>(argumentsJson)!.Select(e => e.GetRawText()).ToList();

    // Sql expected output is precomputed (best-effort) exactly like exam questions do, so a
    // copy into an exam carries it and students see it without a recompute.
    private async Task ApplyCodeAsync(BankQuestion q, SaveBankQuestionCommand c, CancellationToken ct)
    {
        if (c.QuestionType != "CodeProgram" || c.Code is null)
        {
            q.CodeSpecJson = null;
            return;
        }

        var spec = c.Code;
        var sqlCases = spec.SqlTestCases.Select(t => new QuestionSqlTestCase { SetupSql = t.SetupSql }).ToList();
        await SqlExpectedOutputPopulator.PopulateAsync(_sqlClient, _logger, spec.ProgrammingLanguage, spec.SampleAnswer, c.BearerToken, sqlCases, ct);
        spec = spec with { SqlTestCases = sqlCases.Select(t => new BankCodeSqlTestCase(t.SetupSql, t.ExpectedOutput)).ToList() };
        q.CodeSpecJson = spec.ToJson();
    }

    private static void Apply(BankQuestion q, SaveBankQuestionCommand c)
    {
        q.SubjectId = c.SubjectId;
        q.TopicId = c.TopicId;
        q.QuestionType = Enum.Parse<QuestionType>(c.QuestionType);
        q.QuestionText = c.QuestionText.Trim();
        q.Explanation = string.IsNullOrWhiteSpace(c.Explanation) ? null : c.Explanation.Trim();
        q.Difficulty = Enum.Parse<QuestionDifficulty>(c.Difficulty, ignoreCase: true);
        q.DefaultMarks = c.DefaultMarks;
        q.NegativeMarks = c.NegativeMarks;
        q.ShuffleOptions = c.ShuffleOptions && c.QuestionType != "CodeProgram";
        q.Status = Enum.Parse<BankQuestionStatus>(c.Status, ignoreCase: true);
    }

    private static List<BankQuestionOption> BuildOptions(Guid questionId, SaveBankQuestionCommand c) =>
        c.Options.Select((o, i) => new BankQuestionOption
        {
            QuestionId = questionId,
            OptionText = o.Text.Trim(),
            IsCorrect = o.IsCorrect,
            DisplayOrder = i,
        }).ToList();

    private static List<string> ValidateName(string? name, string? description)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(name)) errors.Add("Name is required.");
        else if (name.Trim().Length > 150) errors.Add("Name must be at most 150 characters.");
        if (description is { Length: > 500 }) errors.Add("Description must be at most 500 characters.");
        return errors;
    }
}
