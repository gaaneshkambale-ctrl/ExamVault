using OnlineExamSystem.ApiGateway.Multitenancy;

namespace OnlineExamSystem.ApiGateway;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddReverseProxy()
            .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

        builder.Services.AddMemoryCache();
        builder.Services.AddHttpClient<ITenantLookupClient, TenantLookupClient>(client =>
        {
            client.BaseAddress = new Uri(builder.Configuration["Services:UserServiceBaseUrl"]!);
        });

        // Allowed frontend origins come from config (Cors:AllowedOrigins, comma-separated)
        // so each environment (local dev, Azure dev/qa/prod) can allow its own frontend
        // URL without a code change. Falls back to the local Vite dev server only.
        var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:5173")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        const string frontendCorsPolicy = "Frontend";
        builder.Services.AddCors(options =>
        {
            options.AddPolicy(frontendCorsPolicy, policy =>
                policy.WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod());
        });

        var app = builder.Build();

        app.UseHttpsRedirection();

        app.UseCors(frontendCorsPolicy);

        app.UseMiddleware<TenantResolutionMiddleware>();

        app.MapGet("/", () => "ExamVault API Gateway");
        app.MapReverseProxy();

        app.Run();
    }
}
