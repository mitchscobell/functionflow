FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY TodoApi.sln .
COPY TodoApi/TodoApi.csproj TodoApi/
COPY TodoApi.Tests/TodoApi.Tests.csproj TodoApi.Tests/
RUN dotnet restore

COPY . .
RUN dotnet publish TodoApi/TodoApi.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

RUN mkdir -p /app/data

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "TodoApi.dll"]
