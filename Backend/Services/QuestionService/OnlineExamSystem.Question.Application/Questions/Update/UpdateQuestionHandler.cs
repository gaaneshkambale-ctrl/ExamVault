using FluentValidation;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Question.Domain.Enums;

namespace OnlineExamSystem.Question.Application.Questions.Update;

public class UpdateQuestionHandler
{
    private readonly IQuestionRepository _questionRepository;
    private readonly IValidator<UpdateQuestionCommand> _validator;
    private readonly ISqlExpectedOutputClient _sqlExpectedOutputClient;
    private readonly ILogger<UpdateQuestionHandler> _logger;

    public UpdateQuestionHandler(
        IQuestionRepository questionRepository,
        IValidator<UpdateQuestionCommand> validator,
        ISqlExpectedOutputClient sqlExpectedOutputClient,
        ILogger<UpdateQuestionHandler> logger)
    {
        _questionRepository = questionRepository;
        _validator = validator;
        _sqlExpectedOutputClient = sqlExpectedOutputClient;
        _logger = logger;
    }

    public async Task<UpdateQuestionResult> HandleAsync(
        UpdateQuestionCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return UpdateQuestionResult.Invalid(errors);
        }

        var question = await _questionRepository.GetQuestionByIdAsync(command.QuestionId, cancellationToken);
        if (question is null)
        {
            return UpdateQuestionResult.NotFound();
        }

        if (command.OwnerUserId is { } ownerUserId && question.CreatedByUserId != ownerUserId)
        {
            return UpdateQuestionResult.Forbidden();
        }

        question.QuestionType = Enum.Parse<QuestionType>(command.QuestionType, ignoreCase: true);
        question.QuestionText = command.QuestionText;
        question.Marks = command.Marks;
        question.Difficulty = Enum.Parse<QuestionDifficulty>(command.Difficulty, ignoreCase: true);
        question.ShuffleOptions = command.ShuffleOptions;
        question.StarterCode = command.StarterCode;
        question.ProgrammingLanguage = command.ProgrammingLanguage;
        question.AllowLanguageChange = command.AllowLanguageChange;
        question.SampleAnswer = command.SampleAnswer;
        question.FunctionName = command.FunctionName;
        question.ReturnType = command.ReturnType is null
            ? null
            : Enum.Parse<ParameterType>(command.ReturnType, ignoreCase: true);
        question.SampleInput = command.SampleInput;
        question.SampleOutput = command.SampleOutput;
        question.Constraints = command.Constraints;

        await _questionRepository.RemoveOptionsByQuestionIdAsync(question.Id, cancellationToken);
        await _questionRepository.RemoveParametersByQuestionIdAsync(question.Id, cancellationToken);
        await _questionRepository.RemoveTestCasesByQuestionIdAsync(question.Id, cancellationToken);
        await _questionRepository.RemoveSqlTestCasesByQuestionIdAsync(question.Id, cancellationToken);

        var options = command.Options
            .Select((option, index) => new QuestionOption
            {
                QuestionId = question.Id,
                OptionText = option.OptionText,
                IsCorrect = option.IsCorrect,
                DisplayOrder = index,
            })
            .ToList();
        await _questionRepository.AddOptionsAsync(options, cancellationToken);

        var parameters = (command.Parameters ?? [])
            .Select((parameter, index) => new QuestionParameter
            {
                QuestionId = question.Id,
                Name = parameter.Name,
                Type = Enum.Parse<ParameterType>(parameter.Type, ignoreCase: true),
                DisplayOrder = index,
            })
            .ToList();
        await _questionRepository.AddParametersAsync(parameters, cancellationToken);

        var testCases = (command.TestCases ?? [])
            .Select((testCase, index) => new QuestionTestCase
            {
                QuestionId = question.Id,
                ArgumentsJson = "[" + string.Join(",", testCase.Arguments) + "]",
                ExpectedOutputJson = testCase.ExpectedOutput,
                DisplayOrder = index,
            })
            .ToList();
        await _questionRepository.AddTestCasesAsync(testCases, cancellationToken);

        var sqlTestCases = (command.SqlTestCases ?? [])
            .Select((testCase, index) => new QuestionSqlTestCase
            {
                QuestionId = question.Id,
                SetupSql = testCase.SetupSql,
                DisplayOrder = index,
            })
            .ToList();
        await SqlExpectedOutputPopulator.PopulateAsync(
            _sqlExpectedOutputClient,
            _logger,
            command.ProgrammingLanguage,
            command.SampleAnswer,
            command.BearerToken,
            sqlTestCases,
            cancellationToken);

        await _questionRepository.AddSqlTestCasesAsync(sqlTestCases, cancellationToken);

        await _questionRepository.SaveChangesAsync(cancellationToken);

        return UpdateQuestionResult.Ok(question, options, parameters, testCases, sqlTestCases);
    }
}
