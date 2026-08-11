using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.Register;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Persistence;
using OnlineExamSystem.User.Infrastructure.Repositories;

namespace OnlineExamSystem.User.API;

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

        builder.Services.AddDbContext<UserDbContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("UserDb")));
        builder.Services.AddScoped<IUserRepository, UserRepository>();

        builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();
        builder.Services.AddScoped<IValidator<RegisterUserCommand>, RegisterUserValidator>();
        builder.Services.AddScoped<RegisterUserHandler>();

        // Dev-only: React calls User API directly until Phase 2 puts the Gateway in front of it.
        const string frontendDevCorsPolicy = "FrontendDev";
        builder.Services.AddCors(options =>
        {
            options.AddPolicy(frontendDevCorsPolicy, policy =>
                policy.WithOrigins("http://localhost:5173")
                    .AllowAnyHeader()
                    .AllowAnyMethod());
        });

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseCors(frontendDevCorsPolicy);

        app.UseAuthorization();


        app.MapControllers();

        app.Run();
    }
}
