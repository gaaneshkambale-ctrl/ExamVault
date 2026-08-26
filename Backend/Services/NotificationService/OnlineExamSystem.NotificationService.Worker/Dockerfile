FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY . .
RUN dotnet restore "Backend/Services/NotificationService/OnlineExamSystem.NotificationService.Worker/OnlineExamSystem.NotificationService.Worker.csproj"
RUN dotnet publish "Backend/Services/NotificationService/OnlineExamSystem.NotificationService.Worker/OnlineExamSystem.NotificationService.Worker.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "OnlineExamSystem.NotificationService.Worker.dll"]
