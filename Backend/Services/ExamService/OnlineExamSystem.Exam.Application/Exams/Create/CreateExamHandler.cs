using FluentValidation;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.Application.Exams.Create;

public class CreateExamHandler
{
    private readonly IExamRepository _examRepository;
    private readonly IValidator<CreateExamCommand> _validator;
    private readonly ITenantLimitsClient _tenantLimitsClient;
    private readonly ICurrentTenant _currentTenant;

    public CreateExamHandler(
        IExamRepository examRepository,
        IValidator<CreateExamCommand> validator,
        ITenantLimitsClient tenantLimitsClient,
        ICurrentTenant currentTenant)
    {
        _examRepository = examRepository;
        _validator = validator;
        _tenantLimitsClient = tenantLimitsClient;
        _currentTenant = currentTenant;
    }

    public async Task<CreateExamResult> HandleAsync(
        CreateExamCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return CreateExamResult.Invalid(errors);
        }

        if (command.ExamTypeId is { } examTypeId &&
            await _examRepository.GetExamTypeByIdAsync(examTypeId, cancellationToken) is null)
        {
            return CreateExamResult.Invalid(["Exam type not found."]);
        }

        // Real Tenant Settings > Default Limits "Max Exams" enforcement - a
        // Super Admin request (no tenant context, e.g. seeding) skips this,
        // same as every other tenant-scoped check in this codebase. A
        // failed/unreachable UserService call fails open (never blocks exam
        // creation over a transient cross-service error).
        if (_currentTenant.IsAuthenticated && !_currentTenant.IsSuperAdmin)
        {
            TenantLimits? limits = null;
            try
            {
                limits = await _tenantLimitsClient.GetLimitsAsync(_currentTenant.TenantId, cancellationToken);
            }
            catch
            {
                // Fail open - see comment above.
            }

            if (limits?.MaxExams is not null)
            {
                var currentExamCount = await _examRepository.CountByTenantAsync(_currentTenant.TenantId, cancellationToken);
                if (currentExamCount >= limits.MaxExams)
                {
                    return CreateExamResult.Invalid([$"This organization has reached its limit of {limits.MaxExams} exams."]);
                }
            }
        }

        // Exam Settings' configured defaults now actually seed a new exam's
        // Settings-panel fields (previously always the entity's own hardcoded
        // property initializers, ignoring whatever the Admin configured - see
        // ExamDefaults.cs's own doc comment). Duration/TotalMarks/PassingMarks
        // stay driven by the command instead - those are collected directly on
        // the Create Exam form itself, which prefills FROM these same defaults
        // client-side (CreateExam.tsx), so the command already carries the
        // Admin's (possibly-edited) choice by the time it gets here.
        // AutoSaveEnabled/QuestionNavigationMode/ResultPublishingMode have no
        // corresponding ExamPaper field to seed - stay deferred, unchanged.
        var defaults = await _examRepository.GetOrCreateExamDefaultsAsync(cancellationToken);

        var exam = new ExamPaper
        {
            Title = command.Title,
            Description = command.Description,
            Category = command.Category,
            Tags = command.Tags,
            ContainsSections = command.ContainsSections,
            CreationMethod = Enum.Parse<CreationMethod>(command.CreationMethod, ignoreCase: true),
            ExamTypeId = command.ExamTypeId,
            DurationMinutes = command.DurationMinutes,
            TotalMarks = command.TotalMarks,
            PassingMarks = command.PassingMarks,
            Instructions = command.Instructions,
            CreatedByUserId = command.CreatedByUserId,
            MaxAttempts = defaults.DefaultMaxAttempts,
            NegativeMarkingEnabled = defaults.NegativeMarkingEnabled,
            NegativeMarks = defaults.NegativeMarkingValue,
            AutoSubmitOnTimeEnd = defaults.AutoSubmitEnabled,
        };
        exam.ExamCode = GenerateExamCode(command.Category, exam.Id);

        await _examRepository.AddAsync(exam, cancellationToken);
        await _examRepository.SaveChangesAsync(cancellationToken);

        return CreateExamResult.Ok(exam);
    }

    /// <summary>Admins no longer type an Exam Code - it's derived from the exam's own
    /// newly-assigned Id, which is already unique, so this needs no DB round-trip or
    /// counter table and can never collide.</summary>
    private static string GenerateExamCode(string category, Guid examId)
    {
        var prefix = new string(category.Where(char.IsLetter).Take(3).ToArray()).ToUpperInvariant();
        if (prefix.Length == 0)
        {
            prefix = "EXM";
        }

        var suffix = examId.ToString("N")[..6].ToUpperInvariant();
        return $"{prefix}-{DateTime.UtcNow.Year}-{suffix}";
    }
}
