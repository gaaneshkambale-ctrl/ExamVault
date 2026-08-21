using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Submission.Application.Attempts.CompleteSection;
using OnlineExamSystem.Submission.Application.Attempts.EnterSection;
using OnlineExamSystem.Submission.Application.Attempts.ForceSubmit;
using OnlineExamSystem.Submission.Application.Attempts.JoinRecording;
using OnlineExamSystem.Submission.Application.Attempts.ListByExam;
using OnlineExamSystem.Submission.Application.Attempts.ListByUser;
using OnlineExamSystem.Submission.Application.Attempts.ListLiveByExam;
using OnlineExamSystem.Submission.Application.Attempts.Mine;
using OnlineExamSystem.Submission.Application.Attempts.RecordFullscreenExit;
using OnlineExamSystem.Submission.Application.Attempts.RecordProctoringViolation;
using OnlineExamSystem.Submission.Application.Attempts.ListViolationsByExam;
using OnlineExamSystem.Submission.Application.Attempts.SaveAnswer;
using OnlineExamSystem.Submission.Application.Attempts.SetLiveWatch;
using OnlineExamSystem.Submission.Application.Attempts.Start;
using OnlineExamSystem.Submission.Application.Attempts.Submit;
using OnlineExamSystem.Submission.Application.Attempts.UpdateViolationStatus;
using OnlineExamSystem.Submission.Application.Attempts.WatchRecording;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Infrastructure;
using OnlineExamSystem.Submission.Infrastructure.Persistence;
using OnlineExamSystem.Submission.Infrastructure.Repositories;

namespace OnlineExamSystem.Submission.API;

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

        builder.Services.AddDbContext<SubmissionDbContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("SubmissionDb")));
        builder.Services.AddScoped<ISubmissionRepository, SubmissionRepository>();

        var examServiceBaseUrl = builder.Configuration["Services:ExamServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:ExamServiceBaseUrl\" configuration.");
        // Trailing slash is required: HttpClient/Uri combine a relative request path against
        // BaseAddress per RFC 3986 §5.3, which drops the last base path segment (e.g. Dapr's
        // "/v1.0/invoke/{app}/method") unless the base itself ends in "/".
        builder.Services.AddHttpClient<IExamLookupClient, ExamServiceClient>(client =>
            client.BaseAddress = new Uri(examServiceBaseUrl.TrimEnd('/') + "/"));
        builder.Services.AddHttpClient<IAssignmentLookupClient, AssignmentServiceClient>(client =>
            client.BaseAddress = new Uri(examServiceBaseUrl.TrimEnd('/') + "/"));

        // Optional: student exam recording via Metered.ca. Falls back to a
        // no-op implementation when unconfigured, rather than requiring it
        // like ExamServiceBaseUrl above - recording is an enhancement, not
        // something every deployment needs to provide.
        var meteredApiKey = builder.Configuration["Metered:ApiKey"];
        var meteredAppDomain = builder.Configuration["Metered:AppDomain"];
        if (!string.IsNullOrWhiteSpace(meteredApiKey) && !string.IsNullOrWhiteSpace(meteredAppDomain))
        {
            builder.Services.AddHttpClient("MeteredClient", client =>
                client.BaseAddress = new Uri($"https://{meteredAppDomain.TrimEnd('/')}/"));
            builder.Services.AddScoped<IVideoRecordingService>(sp => new MeteredVideoRecordingService(
                sp.GetRequiredService<IHttpClientFactory>().CreateClient("MeteredClient"),
                meteredApiKey,
                meteredAppDomain,
                sp.GetRequiredService<ILogger<MeteredVideoRecordingService>>()));
        }
        else
        {
            builder.Services.AddScoped<IVideoRecordingService, NullVideoRecordingService>();
        }

        builder.Services.AddScoped<IValidator<StartAttemptCommand>, StartAttemptValidator>();
        builder.Services.AddScoped<StartAttemptHandler>();
        builder.Services.AddScoped<IValidator<SaveAnswerCommand>, SaveAnswerValidator>();
        builder.Services.AddScoped<SaveAnswerHandler>();
        builder.Services.AddScoped<IValidator<SubmitAttemptCommand>, SubmitAttemptValidator>();
        builder.Services.AddScoped<SubmitAttemptHandler>();
        builder.Services.AddScoped<ForceSubmitAttemptHandler>();
        builder.Services.AddScoped<JoinRecordingHandler>();
        builder.Services.AddScoped<SetLiveWatchHandler>();
        builder.Services.AddScoped<WatchRecordingHandler>();
        builder.Services.AddScoped<GetMyAttemptHandler>();
        builder.Services.AddScoped<ListAttemptsByExamHandler>();
        builder.Services.AddScoped<ListLiveAttemptsByExamHandler>();
        builder.Services.AddScoped<ListAttemptsByUserHandler>();
        builder.Services.AddScoped<RecordFullscreenExitHandler>();
        builder.Services.AddScoped<RecordProctoringViolationHandler>();
        builder.Services.AddScoped<ListViolationsByExamHandler>();
        builder.Services.AddScoped<UpdateViolationStatusHandler>();
        builder.Services.AddScoped<EnterSectionHandler>();
        builder.Services.AddScoped<CompleteSectionHandler>();

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
            scope.ServiceProvider.GetRequiredService<SubmissionDbContext>().Database.Migrate();
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
