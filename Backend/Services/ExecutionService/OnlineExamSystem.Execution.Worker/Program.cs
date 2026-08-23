using OnlineExamSystem.Execution.Worker;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.Configure<RabbitMqSettings>(builder.Configuration.GetSection("RabbitMq"));
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddSingleton<SystemTokenProvider>();

builder.Services.AddHttpClient<IQuestionServiceClient, QuestionServiceClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Services:QuestionServiceBaseUrl"]!);
});
builder.Services.AddHttpClient<IExecutionServiceClient, ExecutionServiceClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Services:ExecutionServiceBaseUrl"]!);
});
builder.Services.AddHttpClient<ISubmissionServiceClient, SubmissionServiceClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Services:SubmissionServiceBaseUrl"]!);
});

builder.Services.AddHostedService<CodeAnswerSubmittedConsumer>();

var host = builder.Build();
host.Run();
