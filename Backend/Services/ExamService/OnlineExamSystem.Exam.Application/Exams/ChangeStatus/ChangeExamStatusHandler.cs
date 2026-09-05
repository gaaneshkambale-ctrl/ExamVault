using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Exam.Domain.Rules;

namespace OnlineExamSystem.Exam.Application.Exams.ChangeStatus;

public class ChangeExamStatusHandler
{
    private readonly IExamRepository _examRepository;
    private readonly IQuestionServiceClient _questionServiceClient;

    public ChangeExamStatusHandler(IExamRepository examRepository, IQuestionServiceClient questionServiceClient)
    {
        _examRepository = examRepository;
        _questionServiceClient = questionServiceClient;
    }

    public async Task<ChangeExamStatusResult> HandleAsync(
        ChangeExamStatusCommand command,
        CancellationToken cancellationToken = default)
    {
        var exam = await _examRepository.GetByIdAsync(command.ExamId, cancellationToken);
        if (exam is null)
        {
            return ChangeExamStatusResult.NotFound();
        }

        // Instructor is restricted to exams they created themselves, same
        // ownership rule Update already enforces; Admin/SuperAdmin remain
        // unrestricted (null = no ownership check).
        if (command.OwnerUserId is { } ownerUserId && exam.CreatedByUserId != ownerUserId)
        {
            return ChangeExamStatusResult.Forbidden();
        }

        if (!ExamStatusTransitions.CanTransition(exam.Status, command.TargetStatus))
        {
            return ChangeExamStatusResult.Invalid();
        }

        if (command.TargetStatus == ExamStatus.Published)
        {
            var errors = new List<string>();

            // exam.TotalQuestions (and section.QuestionCount below) are just admin-*declared*
            // numbers, never synced to what's actually in Question Service (a different
            // microservice/DB) - the real count has to come from there, or an exam with zero
            // real questions can be published with no warning at all.
            var realQuestionCount = await _questionServiceClient.GetQuestionCountAsync(
                exam.Id, command.BearerToken, cancellationToken);
            if (realQuestionCount == 0)
            {
                errors.Add("This exam has no questions yet. Add at least one question before publishing.");
            }

            // Non-sectioned exams get an implicit single "General" section purely so Question
            // Assignment has somewhere to save to (GetOrCreateDefaultSectionHandler) - its
            // Marks/QuestionCount are never surfaced to the admin and stay 0, so this check would
            // misfire on every non-sectioned exam. Only exams built via the section wizard, where
            // the admin explicitly typed per-section totals, can actually have this mismatch.
            if (exam.ContainsSections)
            {
                var sections = await _examRepository.GetSectionsByExamIdAsync(exam.Id, cancellationToken);
                errors.AddRange(ValidatePublishTotals(exam, sections));
            }

            if (errors.Count > 0)
            {
                return ChangeExamStatusResult.ValidationFailed(errors);
            }
        }

        exam.Status = command.TargetStatus;
        await _examRepository.SaveChangesAsync(cancellationToken);

        return ChangeExamStatusResult.Ok(exam);
    }

    /// <summary>Section totals (Marks/DurationMinutes/QuestionCount) are independently
    /// admin-entered, never auto-synced to the exam's declared totals. Publishing with a
    /// mismatch makes results wrong (score % divides by the declared total, not the real
    /// achievable one) or the exam mathematically unpassable (PassingMarks above the real
    /// achievable max), so it's blocked here rather than left as a silent trap.</summary>
    private static List<string> ValidatePublishTotals(ExamPaper exam, IReadOnlyList<Section> sections)
    {
        var errors = new List<string>();

        if (sections.Count == 0)
        {
            errors.Add("This exam has no sections. Add at least one section before publishing.");
            return errors;
        }

        var sumMarks = sections.Sum(s => s.Marks);
        var sumDuration = sections.Sum(s => s.DurationMinutes);
        var sumQuestions = sections.Sum(s => s.QuestionCount);

        if (sumMarks != exam.TotalMarks)
        {
            errors.Add(
                $"Section marks add up to {sumMarks}, but the exam's Total Marks is set to " +
                $"{exam.TotalMarks}. Update the sections or the exam's Total Marks so they match.");
        }

        if (sumDuration != exam.DurationMinutes)
        {
            errors.Add(
                $"Section durations add up to {sumDuration} minute(s), but the exam's Duration is " +
                $"set to {exam.DurationMinutes} minute(s). Update the sections or the exam's " +
                "Duration so they match.");
        }

        if (exam.TotalQuestions > 0 && sumQuestions != exam.TotalQuestions)
        {
            errors.Add(
                $"Section question counts add up to {sumQuestions}, but the exam's Total " +
                $"Questions is set to {exam.TotalQuestions}. Update the sections or the exam's " +
                "Total Questions so they match.");
        }

        if (exam.PassingMarks > sumMarks)
        {
            errors.Add(
                $"Passing Marks is set to {exam.PassingMarks}, but the sections only add up to " +
                $"{sumMarks} marks in total, so this exam could never be passed. Lower Passing " +
                "Marks or increase the section marks.");
        }

        return errors;
    }
}
