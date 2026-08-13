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
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Infrastructure;
using OnlineExamSystem.Exam.Infrastructure.Persistence;
using OnlineExamSystem.Exam.Infrastructure.Repositories;

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
        builder.Services.AddHttpClient<IUserLookupClient, UserServiceClient>(client =>
            client.BaseAddress = new Uri(userServiceBaseUrl));

        builder.Services.AddScoped<IValidator<CreateExamCommand>, CreateExamValidator>();
        builder.Services.AddScoped<CreateExamHandler>();
        builder.Services.AddScoped<GetExamHandler>();
        builder.Services.AddScoped<ListExamsHandler>();
        builder.Services.AddScoped<IValidator<UpdateExamCommand>, UpdateExamValidator>();
        builder.Services.AddScoped<UpdateExamHandler>();
        builder.Services.AddScoped<ChangeExamStatusHandler>();
        builder.Services.AddScoped<DeleteExamHandler>();

        builder.Services.AddScoped<IValidator<CreateAssignmentCommand>, CreateAssignmentValidator>();
        builder.Services.AddScoped<CreateAssignmentHandler>();
        builder.Services.AddScoped<IValidator<UpdateAssignmentCommand>, UpdateAssignmentValidator>();
        builder.Services.AddScoped<UpdateAssignmentHandler>();
        builder.Services.AddScoped<ListAllAssignmentsHandler>();
        builder.Services.AddScoped<ListAssignmentsForExamHandler>();
        builder.Services.AddScoped<GetAssignmentHandler>();
        builder.Services.AddScoped<DeleteAssignmentHandler>();
        builder.Services.AddScoped<GetMyAssignmentForExamHandler>();

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
