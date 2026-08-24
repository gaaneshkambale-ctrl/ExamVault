using System.Text;
using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Execution.Application.Interfaces;
using OnlineExamSystem.Execution.Application.Run;
using OnlineExamSystem.Execution.Application.Sql;
using OnlineExamSystem.Execution.Infrastructure;
using OnlineExamSystem.Execution.Infrastructure.Drivers;

namespace OnlineExamSystem.Execution.API;

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

        // No DbContext/repository registrations here - Execution Service owns no database.
        builder.Services.AddHealthChecks();

        var pistonBaseUrl = builder.Configuration["Piston:BaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Piston:BaseUrl\" configuration.");
        builder.Services.AddHttpClient<IPistonClient, PistonClient>(client =>
            client.BaseAddress = new Uri(pistonBaseUrl.TrimEnd('/') + "/"));

        builder.Services.AddSingleton<IDriverGenerator, PythonDriverGenerator>();
        builder.Services.AddSingleton<IDriverGenerator, JavaScriptDriverGenerator>();
        builder.Services.AddSingleton<IDriverGenerator, JavaDriverGenerator>();
        builder.Services.AddSingleton<IDriverGenerator, CSharpDriverGenerator>();
        builder.Services.AddSingleton<IDriverGenerator, CppDriverGenerator>();

        builder.Services.AddScoped<IValidator<RunCodeCommand>, RunCodeValidator>();
        builder.Services.AddScoped<RunCodeHandler>();

        var questionServiceBaseUrl = builder.Configuration["Services:QuestionServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:QuestionServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<IQuestionServiceClient, QuestionServiceClient>(client =>
            client.BaseAddress = new Uri(questionServiceBaseUrl.TrimEnd('/') + "/"));
        builder.Services.AddScoped<RunSqlHandler>();

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
