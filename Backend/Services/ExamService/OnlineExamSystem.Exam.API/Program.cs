using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Exam.Application.Assignments.Create;
using OnlineExamSystem.Exam.Application.Assignments.Delete;
using OnlineExamSystem.Exam.Application.Assignments.GetById;
using OnlineExamSystem.Exam.Application.Assignments.List;
using OnlineExamSystem.Exam.Application.Assignments.Mine;
using OnlineExamSystem.Exam.Application.Assignments.Update;
using OnlineExamSystem.Exam.Application.Exams.ChangeStatus;
using OnlineExamSystem.Exam.Application.Exams.Create;
using OnlineExamSystem.Exam.Application.Exams.Delete;
using OnlineExamSystem.Exam.Application.Exams.GetById;
using OnlineExamSystem.Exam.Application.Exams.List;
using OnlineExamSystem.Exam.Application.Exams.Update;
using OnlineExamSystem.Exam.API.Jobs;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Application.Proctoring.GetProctoringSettings;
using OnlineExamSystem.Exam.Application.Proctoring.UpdateProctoringSettings;
using OnlineExamSystem.Exam.Application.Reminders.GetReminderSettings;
using OnlineExamSystem.Exam.Application.Reminders.UpdateReminderSettings;
using OnlineExamSystem.Exam.Application.Sections.Create;
using OnlineExamSystem.Exam.Application.Sections.Delete;
using OnlineExamSystem.Exam.Application.Sections.GetById;
using OnlineExamSystem.Exam.Application.Sections.List;
using OnlineExamSystem.Exam.Application.Sections.Reorder;
using OnlineExamSystem.Exam.Application.Sections.Update;
using OnlineExamSystem.Exam.Infrastructure;
using OnlineExamSystem.Exam.Infrastructure.Messaging;
using OnlineExamSystem.Exam.Infrastructure.Persistence;
using OnlineExamSystem.Exam.Infrastructure.Repositories;
using OnlineExamSystem.Shared.Events.Publishing;

namespace OnlineExamSystem.Exam.API;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.

        builder.Services.AddControllers();
        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        builder.Services.AddDbContext<ExamDbContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("ExamDb")));
        builder.Services.AddScoped<IExamRepository, ExamRepository>();

        var userServiceBaseUrl = builder.Configuration["Services:UserServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:UserServiceBaseUrl\" configuration.");
        // Trailing slash is required: HttpClient/Uri combine a relative request path against
        // BaseAddress per RFC 3986 §5.3, which drops the last base path segment (e.g. Dapr's
        // "/v1.0/invoke/{app}/method") unless the base itself ends in "/".
        var userServiceBaseUri = new Uri(userServiceBaseUrl.TrimEnd('/') + "/");
        builder.Services.AddHttpClient<IUserLookupClient, UserServiceClient>(client =>
            client.BaseAddress = userServiceBaseUri);
        builder.Services.AddHttpClient<IInternalUserLookupClient, InternalUserServiceClient>(client =>
            client.BaseAddress = userServiceBaseUri);

        var questionServiceBaseUrl = builder.Configuration["Services:QuestionServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:QuestionServiceBaseUrl\" configuration.");
        var questionServiceBaseUri = new Uri(questionServiceBaseUrl.TrimEnd('/') + "/");
        builder.Services.AddHttpClient<IQuestionServiceClient, QuestionServiceClient>(client =>
            client.BaseAddress = questionServiceBaseUri);

        builder.Services.AddScoped<IValidator<CreateExamCommand>, CreateExamValidator>();
        builder.Services.AddScoped<CreateExamHandler>();
        builder.Services.AddScoped<GetExamHandler>();
        builder.Services.AddScoped<ListExamsHandler>();
        builder.Services.AddScoped<IValidator<UpdateExamCommand>, UpdateExamValidator>();
        builder.Services.AddScoped<UpdateExamHandler>();
        builder.Services.AddScoped<ChangeExamStatusHandler>();
        builder.Services.AddScoped<DeleteExamHandler>();

        builder.Services.AddScoped<IValidator<CreateSectionCommand>, CreateSectionValidator>();
        builder.Services.AddScoped<CreateSectionHandler>();
        builder.Services.AddScoped<IValidator<UpdateSectionCommand>, UpdateSectionValidator>();
        builder.Services.AddScoped<UpdateSectionHandler>();
        builder.Services.AddScoped<DeleteSectionHandler>();
        builder.Services.AddScoped<GetSectionHandler>();
        builder.Services.AddScoped<ListSectionsHandler>();
        builder.Services.AddScoped<ReorderSectionsHandler>();

        builder.Services.AddScoped<IValidator<CreateAssignmentCommand>, CreateAssignmentValidator>();
        builder.Services.AddScoped<CreateAssignmentHandler>();
        builder.Services.AddScoped<IValidator<UpdateAssignmentCommand>, UpdateAssignmentValidator>();
        builder.Services.AddScoped<UpdateAssignmentHandler>();
        builder.Services.AddScoped<ListAllAssignmentsHandler>();
        builder.Services.AddScoped<ListAssignmentsForExamHandler>();
        builder.Services.AddScoped<GetAssignmentHandler>();
        builder.Services.AddScoped<DeleteAssignmentHandler>();
        builder.Services.AddScoped<GetMyAssignmentForExamHandler>();

        builder.Services.AddScoped<GetReminderSettingsHandler>();
        builder.Services.AddScoped<UpdateReminderSettingsHandler>();
        builder.Services.AddScoped<GetProctoringSettingsHandler>();
        builder.Services.AddScoped<UpdateProctoringSettingsHandler>();

        if (builder.Configuration["Messaging:Provider"] == "ServiceBus")
        {
            builder.Services.Configure<ServiceBusSettings>(builder.Configuration.GetSection("ServiceBus"));
            builder.Services.AddSingleton<IEventPublisher, ServiceBusEventPublisher>();
        }
        else
        {
            builder.Services.Configure<RabbitMqSettings>(builder.Configuration.GetSection("RabbitMq"));
            builder.Services.AddSingleton<IEventPublisher, RabbitMqEventPublisher>();
        }
        builder.Services.AddHostedService<ExamReminderCheckService>();

        var jwtIssuer = builder.Configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException("Missing \"Jwt:Issuer\" configuration.");
        var jwtAudience = builder.Configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException("Missing \"Jwt:Audience\" configuration.");
        var jwtSigningKey = builder.Configuration["Jwt:SigningKey"]
            ?? throw new InvalidOperationException("Missing \"Jwt:SigningKey\" configuration.");

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtIssuer,
                    ValidateAudience = true,
                    ValidAudience = jwtAudience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero,
                };
            });
        builder.Services.AddAuthorization();

        var app = builder.Build();

        using (var scope = app.Services.CreateScope())
        {
            scope.ServiceProvider.GetRequiredService<ExamDbContext>().Database.Migrate();
        }

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        app.Run();
    }
}
