FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY TodoApi.sln .
COPY TodoApi/TodoApi.csproj TodoApi/
COPY TodoApi.Tests/TodoApi.Tests.csproj TodoApi.Tests/
RUN dotnet restore

COPY . .
RUN dotnet publish TodoApi/TodoApi.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app/data

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:5000/api/version || exit 1

ENTRYPOINT ["dotnet", "TodoApi.dll"]
