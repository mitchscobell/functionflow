using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FluentValidation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TodoApi.Data;
using TodoApi.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using TodoApi.Services;
using TodoApi.Repositories;

var builder = WebApplication.CreateBuilder(args);

// --- Database ---
var dbPath = builder.Configuration["Database:Path"] ?? "data/todo.db";
var fullDbPath = Path.IsPathRooted(dbPath) ? dbPath : Path.Combine(builder.Environment.ContentRootPath, dbPath);
Directory.CreateDirectory(Path.GetDirectoryName(fullDbPath)!);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={fullDbPath}"));

// --- Authentication (JWT + API Key) ---
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? (builder.Environment.IsDevelopment()
        ? "FunctionFlowDevKey_ChangeInProduction_MinLength32Chars!"
        : throw new InvalidOperationException("Jwt:Key must be configured in production."));
builder.Configuration["Jwt:Key"] = jwtKey;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "FunctionFlow",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "FunctionFlow",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    })
    .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthHandler>("ApiKey", null);

builder.Services.AddAuthorization(options =>
{
    options.DefaultPolicy = new AuthorizationPolicyBuilder(
        JwtBearerDefaults.AuthenticationScheme, "ApiKey")
        .RequireAuthenticatedUser()
        .Build();
});

// --- Rate Limiting ---
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    var permitLimit = builder.Configuration.GetValue("RateLimit:AuthPermitLimit", 10);
    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

// --- Services ---
builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddSingleton<ICodeGenerator, CryptoCodeGenerator>();
builder.Services.AddHostedService<DemoSessionCleanupService>();
builder.Services.AddScoped<IAdminNotifier, SmtpAdminNotifier>();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// --- Repositories ---
builder.Services.AddScoped<ITaskRepository, EfTaskRepository>();
builder.Services.AddScoped<IListRepository, EfListRepository>();
builder.Services.AddScoped<IUserRepository, EfUserRepository>();
builder.Services.AddScoped<IAuthCodeRepository, EfAuthCodeRepository>();
builder.Services.AddScoped<IApiKeyRepository, EfApiKeyRepository>();

// --- Controllers & JSON ---
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "FunctionFlow API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new()
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new()
    {
        {
            new() { Reference = new() { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

// --- CORS ---
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(
                builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                ?? new[] { "http://localhost:3000", "http://localhost:5173" })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// --- Middleware Pipeline ---
app.UseMiddleware<ErrorHandlerMiddleware>();

// Security headers
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["X-XSS-Protection"] = "0";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// --- Auto-create database on startup ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.Run();

// Make Program accessible for integration tests
public partial class Program { }
