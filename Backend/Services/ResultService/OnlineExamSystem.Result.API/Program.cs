using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Result.Application.GetExamReport;
using OnlineExamSystem.Result.Application.GetResult;
using OnlineExamSystem.Result.Application.Interfaces;
using OnlineExamSystem.Result.Infrastructure;

namespace OnlineExamSystem.Result.API;

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

        // No DbContext/repository registrations here - Result Service owns no
        // database, it computes results on demand from the services that do.
        builder.Services.AddHealthChecks();

        // Trailing slash is required: HttpClient/Uri combine a relative request path against
        // BaseAddress per RFC 3986 §5.3, which drops the last base path segment (e.g. Dapr's
        // "/v1.0/invoke/{app}/method") unless the base itself ends in "/".
        var examServiceBaseUrl = builder.Configuration["Services:ExamServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:ExamServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<IExamLookupClient, ExamServiceClient>(client =>
            client.BaseAddress = new Uri(examServiceBaseUrl.TrimEnd('/') + "/"));

        var questionServiceBaseUrl = builder.Configuration["Services:QuestionServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:QuestionServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<IQuestionAnswerKeyClient, QuestionServiceClient>(client =>
            client.BaseAddress = new Uri(questionServiceBaseUrl.TrimEnd('/') + "/"));

        var submissionServiceBaseUrl = builder.Configuration["Services:SubmissionServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:SubmissionServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<ISubmissionLookupClient, SubmissionServiceClient>(client =>
            client.BaseAddress = new Uri(submissionServiceBaseUrl.TrimEnd('/') + "/"));

        builder.Services.AddScoped<GetResultHandler>();
        builder.Services.AddScoped<GetExamReportHandler>();

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

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapHealthChecks("/health", new HealthCheckOptions { ResponseWriter = WriteHealthCheckResponse });
        app.MapControllers();

        app.Run();
    }

    // Gateway's MonitoringController is the only consumer - no [Authorize] here,
    // this is an infra probe like every other service's /health.
    private static Task WriteHealthCheckResponse(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";
        var payload = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new { name = e.Key, status = e.Value.Status.ToString() }),
        };
        return context.Response.WriteAsync(JsonSerializer.Serialize(payload));
    }
}
