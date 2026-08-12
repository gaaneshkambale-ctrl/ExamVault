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

        var exam = await _examRepository.GetByIdAsync(command.ExamId, cancellationToken);
        if (exam is null)
        {
            return UpdateExamResult.NotFound();
        }

        exam.Title = command.Title;
        exam.Description = command.Description;
        exam.ExamType = Enum.Parse<ExamType>(command.ExamType, ignoreCase: true);
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

        await _examRepository.SaveChangesAsync(cancellationToken);

        return UpdateExamResult.Ok(exam);
    }
}
