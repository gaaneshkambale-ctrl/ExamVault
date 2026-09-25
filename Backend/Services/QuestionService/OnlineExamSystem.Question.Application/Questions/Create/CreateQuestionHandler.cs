using FluentValidation;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Question.Domain.Enums;

namespace OnlineExamSystem.Question.Application.Questions.Create;

public class CreateQuestionHandler
{
    private readonly IQuestionRepository _questionRepository;
    private readonly IValidator<CreateQuestionCommand> _validator;
    private readonly ISqlExpectedOutputClient _sqlExpectedOutputClient;
    private readonly ILogger<CreateQuestionHandler> _logger;

    public CreateQuestionHandler(
        IQuestionRepository questionRepository,
        IValidator<CreateQuestionCommand> validator,
        ISqlExpectedOutputClient sqlExpectedOutputClient,
        ILogger<CreateQuestionHandler> logger)
    {
        _questionRepository = questionRepository;
        _validator = validator;
        _sqlExpectedOutputClient = sqlExpectedOutputClient;
        _logger = logger;
    }

    public async Task<CreateQuestionResult> HandleAsync(
        CreateQuestionCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return CreateQuestionResult.Invalid(errors);
        }

        var question = new ExamQuestion
        {
            ExamId = command.ExamId,
            QuestionType = Enum.Parse<QuestionType>(command.QuestionType, ignoreCase: true),
            QuestionText = command.QuestionText,
            Marks = command.Marks,
            Difficulty = Enum.Parse<QuestionDifficulty>(command.Difficulty, ignoreCase: true),
            ShuffleOptions = command.ShuffleOptions,
            CreatedByUserId = command.CreatedByUserId,
            StarterCode = command.StarterCode,
            ProgrammingLanguage = command.ProgrammingLanguage,
            AllowLanguageChange = command.AllowLanguageChange,
            SampleAnswer = command.SampleAnswer,
            FunctionName = command.FunctionName,
            ReturnType = command.ReturnType is null
                ? null
                : Enum.Parse<ParameterType>(command.ReturnType, ignoreCase: true),
            SampleInput = command.SampleInput,
            SampleOutput = command.SampleOutput,
            Constraints = command.Constraints,
        };

        var options = command.Options
            .Select((option, index) => new QuestionOption
            {
                QuestionId = question.Id,
                OptionText = option.OptionText,
                IsCorrect = option.IsCorrect,
                DisplayOrder = index,
            })
            .ToList();

        var parameters = (command.Parameters ?? [])
            .Select((parameter, index) => new QuestionParameter
            {
                QuestionId = question.Id,
                Name = parameter.Name,
                Type = Enum.Parse<ParameterType>(parameter.Type, ignoreCase: true),
                DisplayOrder = index,
            })
            .ToList();

        var testCases = (command.TestCases ?? [])
            .Select((testCase, index) => new QuestionTestCase
            {
                QuestionId = question.Id,
                ArgumentsJson = "[" + string.Join(",", testCase.Arguments) + "]",
                ExpectedOutputJson = testCase.ExpectedOutput,
                DisplayOrder = index,
            })
            .ToList();

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

        await _questionRepository.AddAsync(question, options, parameters, testCases, sqlTestCases, cancellationToken);
        await _questionRepository.SaveChangesAsync(cancellationToken);

        return CreateQuestionResult.Ok(question, options, parameters, testCases, sqlTestCases);
    }
}
