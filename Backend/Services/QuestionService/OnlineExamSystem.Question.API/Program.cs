using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Application.Questions.BulkAssignSection;
using OnlineExamSystem.Question.Application.Questions.Create;
using OnlineExamSystem.Question.Application.Questions.Delete;
using OnlineExamSystem.Question.Application.Questions.GetById;
using OnlineExamSystem.Question.Application.Questions.List;
using OnlineExamSystem.Question.Application.Questions.UnassignSection;
using OnlineExamSystem.Question.Application.Questions.Update;
using OnlineExamSystem.Question.Infrastructure.Persistence;
using OnlineExamSystem.Question.Infrastructure.Repositories;

namespace OnlineExamSystem.Question.API;

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

        builder.Services.AddDbContext<QuestionDbContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("QuestionDb")));
        builder.Services.AddScoped<IQuestionRepository, QuestionRepository>();

        builder.Services.AddScoped<IValidator<CreateQuestionCommand>, CreateQuestionValidator>();
        builder.Services.AddScoped<CreateQuestionHandler>();
        builder.Services.AddScoped<GetQuestionHandler>();
        builder.Services.AddScoped<ListQuestionsHandler>();
        builder.Services.AddScoped<IValidator<UpdateQuestionCommand>, UpdateQuestionValidator>();
        builder.Services.AddScoped<UpdateQuestionHandler>();
        builder.Services.AddScoped<DeleteQuestionHandler>();
        builder.Services.AddScoped<BulkAssignSectionHandler>();
        builder.Services.AddScoped<UnassignSectionHandler>();

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
            scope.ServiceProvider.GetRequiredService<QuestionDbContext>().Database.Migrate();
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
