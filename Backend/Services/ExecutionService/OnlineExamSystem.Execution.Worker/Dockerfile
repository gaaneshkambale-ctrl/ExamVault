FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY . .
RUN dotnet restore "Backend/Services/ExecutionService/OnlineExamSystem.Execution.Worker/OnlineExamSystem.Execution.Worker.csproj"
RUN dotnet publish "Backend/Services/ExecutionService/OnlineExamSystem.Execution.Worker/OnlineExamSystem.Execution.Worker.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "OnlineExamSystem.Execution.Worker.dll"]
