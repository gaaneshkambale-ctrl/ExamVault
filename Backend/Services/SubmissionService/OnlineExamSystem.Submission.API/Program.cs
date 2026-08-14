using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Submission.Application.Attempts.ListByExam;
using OnlineExamSystem.Submission.Application.Attempts.ListByUser;
using OnlineExamSystem.Submission.Application.Attempts.Mine;
using OnlineExamSystem.Submission.Application.Attempts.SaveAnswer;
using OnlineExamSystem.Submission.Application.Attempts.Start;
using OnlineExamSystem.Submission.Application.Attempts.Submit;
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
        builder.Services.AddHttpClient<IExamLookupClient, ExamServiceClient>(client =>
            client.BaseAddress = new Uri(examServiceBaseUrl));

        builder.Services.AddScoped<IValidator<StartAttemptCommand>, StartAttemptValidator>();
        builder.Services.AddScoped<StartAttemptHandler>();
        builder.Services.AddScoped<IValidator<SaveAnswerCommand>, SaveAnswerValidator>();
        builder.Services.AddScoped<SaveAnswerHandler>();
        builder.Services.AddScoped<IValidator<SubmitAttemptCommand>, SubmitAttemptValidator>();
        builder.Services.AddScoped<SubmitAttemptHandler>();
        builder.Services.AddScoped<GetMyAttemptHandler>();
        builder.Services.AddScoped<ListAttemptsByExamHandler>();
        builder.Services.AddScoped<ListAttemptsByUserHandler>();

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

        app.MapControllers();

        app.Run();
    }
}
