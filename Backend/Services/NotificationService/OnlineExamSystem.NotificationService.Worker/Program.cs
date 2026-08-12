using OnlineExamSystem.NotificationService.Worker;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.Configure<RabbitMqSettings>(builder.Configuration.GetSection("RabbitMq"));
builder.Services.AddHostedService<UserRegisteredConsumer>();

var host = builder.Build();
host.Run();
