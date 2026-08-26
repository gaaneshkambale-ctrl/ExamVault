FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY . .
RUN dotnet restore "Backend/Services/SubmissionService/OnlineExamSystem.Submission.API/OnlineExamSystem.Submission.API.csproj"
RUN dotnet publish "Backend/Services/SubmissionService/OnlineExamSystem.Submission.API/OnlineExamSystem.Submission.API.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "OnlineExamSystem.Submission.API.dll"]
