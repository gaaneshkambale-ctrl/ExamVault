using System.Text.Json;
using Microsoft.Extensions.Options;
using OnlineExamSystem.Shared.Contracts.Requests.Execution;
using OnlineExamSystem.Shared.Contracts.Responses.Execution;
using OnlineExamSystem.Shared.Events.Submission;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace OnlineExamSystem.Execution.Worker;

// Auto-grades a submitted CodeProgram answer against its question's test
// cases (if it has any - a question with none stays manually graded,
// untouched by this consumer). Authoritative and tamper-proof by
// construction: this never reads anything the student's own Run Code
// clicks reported - it re-runs their final submitted code independently.
public class CodeAnswerSubmittedConsumer : BackgroundService
{
    private const string QueueName = "execution-service.code-answer-submitted-events";

    private readonly RabbitMqSettings _settings;
    private readonly ILogger<CodeAnswerSubmittedConsumer> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public CodeAnswerSubmittedConsumer(
        IOptions<RabbitMqSettings> settings,
        ILogger<CodeAnswerSubmittedConsumer> logger,
        IServiceScopeFactory scopeFactory)
    {
        _settings = settings.Value;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var factory = new ConnectionFactory
        {
            HostName = _settings.HostName,
            Port = _settings.Port,
            UserName = _settings.UserName,
            Password = _settings.Password,
        };

        await using var connection = await factory.CreateConnectionAsync(stoppingToken);
        await using var channel = await connection.CreateChannelAsync(cancellationToken: stoppingToken);

        await channel.ExchangeDeclareAsync(
            _settings.ExchangeName, ExchangeType.Fanout, durable: true, cancellationToken: stoppingToken);
        var queue = await channel.QueueDeclareAsync(
            QueueName, durable: true, exclusive: false, autoDelete: false, cancellationToken: stoppingToken);
        await channel.QueueBindAsync(
            queue.QueueName, _settings.ExchangeName, routingKey: string.Empty, cancellationToken: stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(channel);
        consumer.ReceivedAsync += async (_, eventArgs) =>
        {
            if (eventArgs.BasicProperties.Type != nameof(CodeAnswerSubmittedEvent))
            {
                return;
            }

            var submitted = JsonSerializer.Deserialize<CodeAnswerSubmittedEvent>(eventArgs.Body.Span);
            if (submitted is null)
            {
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var tokenProvider = scope.ServiceProvider.GetRequiredService<SystemTokenProvider>();
            var questionClient = scope.ServiceProvider.GetRequiredService<IQuestionServiceClient>();
            var executionClient = scope.ServiceProvider.GetRequiredService<IExecutionServiceClient>();
            var submissionClient = scope.ServiceProvider.GetRequiredService<ISubmissionServiceClient>();

            try
            {
                await GradeAsync(submitted, tokenProvider, questionClient, executionClient, submissionClient, stoppingToken);
            }
            catch (Exception ex)
            {
                // Best-effort - a downstream hiccup here must never crash the
                // worker or lose the attempt; the answer just stays Pending
                // Grading (visible in the manual Grade Code Answers queue as
                // a fallback) until this is investigated.
                _logger.LogError(
                    ex,
                    "Auto-grading failed for attempt {AttemptId}, question {QuestionId}.",
                    submitted.AttemptId,
                    submitted.QuestionId);
            }
        };

        await channel.BasicConsumeAsync(queue.QueueName, autoAck: true, consumer, cancellationToken: stoppingToken);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private static async Task GradeAsync(
        CodeAnswerSubmittedEvent submitted,
        SystemTokenProvider tokenProvider,
        IQuestionServiceClient questionClient,
        IExecutionServiceClient executionClient,
        ISubmissionServiceClient submissionClient,
        CancellationToken cancellationToken)
    {
        var token = tokenProvider.CreateToken(submitted.TenantId);

        var question = await questionClient.GetQuestionAsync(submitted.QuestionId, token, cancellationToken);
        if (question is null)
        {
            return;
        }

        RunCodeResponse runResult;
        if (question.ProgrammingLanguage == "Sql")
        {
            // No Sql test cases - stays manually graded, same as any other
            // language with no test cases.
            if (question.SqlTestCases is not { Count: > 0 })
            {
                return;
            }

            var runSqlRequest = new RunSqlRequest(submitted.QuestionId, submitted.AnswerText);
            runResult = await executionClient.RunSqlAsync(runSqlRequest, token, cancellationToken);
        }
        else
        {
            // No test cases, or an incomplete signature (shouldn't happen given
            // the Question Service validator, but never trust a stale/partial
            // read) - stays manually graded, this consumer takes no action.
            if (question.TestCases is not { Count: > 0 } testCases
                || question.FunctionName is not { Length: > 0 } functionName
                || question.ReturnType is not { Length: > 0 } returnType
                || question.ProgrammingLanguage is not { Length: > 0 } language
                || question.Parameters is not { Count: > 0 } parameters)
            {
                return;
            }

            var runRequest = new RunCodeRequest(
                language,
                submitted.AnswerText,
                functionName,
                parameters.Select(p => new RunCodeParameterRequest(p.Name, p.Type)).ToList(),
                returnType,
                testCases.Select(tc => new RunCodeTestCaseRequest(tc.Arguments, tc.ExpectedOutput)).ToList());

            runResult = await executionClient.RunAsync(runRequest, token, cancellationToken);
        }

        var total = runResult.Outcomes.Count;
        if (total == 0)
        {
            return;
        }

        var passed = runResult.Outcomes.Count(o => o.Passed);
        var marksAwarded = (int)Math.Round(question.Marks * (double)passed / total, MidpointRounding.AwayFromZero);

        await submissionClient.GradeAsync(
            submitted.AttemptId,
            submitted.QuestionId,
            marksAwarded,
            token,
            cancellationToken);
    }
}
