FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY . .
RUN dotnet restore "Backend/Services/ResultService/OnlineExamSystem.Result.API/OnlineExamSystem.Result.API.csproj"
RUN dotnet publish "Backend/Services/ResultService/OnlineExamSystem.Result.API/OnlineExamSystem.Result.API.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "OnlineExamSystem.Result.API.dll"]
