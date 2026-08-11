namespace OnlineExamSystem.ApiGateway;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddReverseProxy()
            .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

        // Dev-only: this is the single entry point the React dev server (localhost:5173) calls.
        const string frontendDevCorsPolicy = "FrontendDev";
        builder.Services.AddCors(options =>
        {
            options.AddPolicy(frontendDevCorsPolicy, policy =>
                policy.WithOrigins("http://localhost:5173")
                    .AllowAnyHeader()
                    .AllowAnyMethod());
        });

        var app = builder.Build();

        app.UseHttpsRedirection();

        app.UseCors(frontendDevCorsPolicy);

        app.MapGet("/", () => "ExamVault API Gateway");
        app.MapReverseProxy();

        app.Run();
    }
}
