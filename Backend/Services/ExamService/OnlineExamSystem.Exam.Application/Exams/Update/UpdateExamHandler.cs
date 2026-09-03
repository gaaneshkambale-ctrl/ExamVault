using FluentValidation;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Exams.Update;

public class UpdateExamHandler
{
    private readonly IExamRepository _examRepository;
    private readonly IValidator<UpdateExamCommand> _validator;

    public UpdateExamHandler(IExamRepository examRepository, IValidator<UpdateExamCommand> validator)
    {
        _examRepository = examRepository;
        _validator = validator;
    }

    public async Task<UpdateExamResult> HandleAsync(
        UpdateExamCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return UpdateExamResult.Invalid(errors);
        }

        if (command.ExamTypeId is { } examTypeId &&
            await _examRepository.GetExamTypeByIdAsync(examTypeId, cancellationToken) is null)
        {
            return UpdateExamResult.Invalid(["Exam type not found."]);
        }

        var exam = await _examRepository.GetByIdAsync(command.ExamId, cancellationToken);
        if (exam is null)
        {
            return UpdateExamResult.NotFound();
        }

        if (command.OwnerUserId is { } ownerUserId && exam.CreatedByUserId != ownerUserId)
        {
            return UpdateExamResult.Forbidden();
        }

        exam.Title = command.Title;
        exam.ExamCode = string.IsNullOrWhiteSpace(command.ExamCode) ? null : command.ExamCode.Trim();
        exam.Description = command.Description;
        exam.CreationMethod = Enum.Parse<CreationMethod>(command.CreationMethod, ignoreCase: true);
        exam.ExamTypeId = command.ExamTypeId;
        exam.DurationMinutes = command.DurationMinutes;
        exam.TotalMarks = command.TotalMarks;
        exam.PassingMarks = command.PassingMarks;
        exam.Instructions = command.Instructions;
        exam.ShuffleQuestions = command.ShuffleQuestions;
        exam.ShuffleOptions = command.ShuffleOptions;
        exam.ShowResult = command.ShowResult;
        exam.ShowCorrectAnswers = command.ShowCorrectAnswers;
        exam.AllowReview = command.AllowReview;
        exam.StartAtUtc = command.StartAtUtc;
        exam.EndAtUtc = command.EndAtUtc;
        exam.MaxAttempts = command.MaxAttempts;
        exam.NegativeMarkingEnabled = command.NegativeMarkingEnabled;
        exam.NegativeMarks = command.NegativeMarks;
        exam.ShowSectionSummaryToStudents = command.ShowSectionSummaryToStudents;
        exam.AllowCalculator = command.AllowCalculator;
        exam.AllowNotes = command.AllowNotes;
        exam.AutoSubmitOnTimeEnd = command.AutoSubmitOnTimeEnd;
        exam.ConfirmBeforeSubmit = command.ConfirmBeforeSubmit;

        await _examRepository.SaveChangesAsync(cancellationToken);

        return UpdateExamResult.Ok(exam);
    }
}
