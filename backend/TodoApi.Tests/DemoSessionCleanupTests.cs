using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using TodoApi.Data;
using TodoApi.Models;
using TodoApi.Repositories;
using TodoApi.Services;

namespace TodoApi.Tests;

public class DemoSessionCleanupTests
{
    private static (DemoSessionCleanupService service, IServiceProvider provider, string dbName) CreateService(
        int maxAgeHours = 24)
    {
        var dbName = "CleanupTest_" + Guid.NewGuid();
        var provider = new ServiceCollection()
            .AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(dbName), ServiceLifetime.Transient)
            .AddTransient<IUserRepository, EfUserRepository>()
            .AddTransient<ITaskRepository, EfTaskRepository>()
            .AddTransient<IListRepository, EfListRepository>()
            .AddTransient<IAuthCodeRepository, EfAuthCodeRepository>()
            .AddTransient<IApiKeyRepository, EfApiKeyRepository>()
            .BuildServiceProvider();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DemoCleanup:IntervalMinutes"] = "1",
                ["DemoCleanup:MaxAgeHours"] = maxAgeHours.ToString()
            })
            .Build();

        var service = new DemoSessionCleanupService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<DemoSessionCleanupService>.Instance,
            config);

        return (service, provider, dbName);
    }

    private static AppDbContext GetDb(IServiceProvider provider) =>
        provider.GetRequiredService<AppDbContext>();

    // ── Stale Session Removal ──

    [Fact(DisplayName = "Cleanup removes stale demo sessions older than max age")]
    public async Task Cleanup_RemovesStaleDemoSessions()
    {
        var (service, provider, _) = CreateService(maxAgeHours: 1);
        var db = GetDb(provider);

        var staleUser = new User
        {
            Email = "demo-abc123@functionflow.local",
            DisplayName = "Demo User",
        };
        db.Users.Add(staleUser);
        await db.SaveChangesAsync();
        // Backdate CreatedAt after save (SetTimestamps overrides it on Add)
        staleUser.CreatedAt = DateTime.UtcNow.AddHours(-2);
        await db.SaveChangesAsync();

        db.Tasks.Add(new TodoTask
        {
            Title = "Stale task",
            UserId = staleUser.Id,
            Tags = Array.Empty<string>()
        });
        await db.SaveChangesAsync();

        await service.CleanupStaleSessions();

        var freshDb = GetDb(provider);
        Assert.Empty(await freshDb.Users.ToListAsync());
        Assert.Empty(await freshDb.Tasks.IgnoreQueryFilters().ToListAsync());
    }

    [Fact(DisplayName = "Cleanup preserves recent demo sessions within max age")]
    public async Task Cleanup_PreservesRecentDemoSessions()
    {
        var (service, provider, _) = CreateService(maxAgeHours: 24);
        var db = GetDb(provider);

        var recentUser = new User
        {
            Email = "demo-recent@functionflow.local",
            DisplayName = "Demo User",
        };
        db.Users.Add(recentUser);
        await db.SaveChangesAsync();
        // 1 hour old — well within 24h retention
        recentUser.CreatedAt = DateTime.UtcNow.AddHours(-1);
        await db.SaveChangesAsync();

        await service.CleanupStaleSessions();

        var freshDb = GetDb(provider);
        Assert.Single(await freshDb.Users.ToListAsync());
    }

    [Fact(DisplayName = "Cleanup preserves real (non-demo) users")]
    public async Task Cleanup_PreservesRealUsers()
    {
        var (service, provider, _) = CreateService(maxAgeHours: 1);
        var db = GetDb(provider);

        var realUser = new User
        {
            Email = "real@example.com",
            DisplayName = "Real Person",
        };
        db.Users.Add(realUser);
        await db.SaveChangesAsync();
        realUser.CreatedAt = DateTime.UtcNow.AddHours(-2);
        await db.SaveChangesAsync();

        await service.CleanupStaleSessions();

        var freshDb = GetDb(provider);
        Assert.Single(await freshDb.Users.ToListAsync());
        Assert.Equal("real@example.com", (await freshDb.Users.FirstAsync()).Email);
    }

    [Fact(DisplayName = "Cleanup removes all related data (tasks, lists, codes, keys)")]
    public async Task Cleanup_RemovesAllRelatedData()
    {
        var (service, provider, _) = CreateService(maxAgeHours: 1);
        var db = GetDb(provider);

        var staleUser = new User
        {
            Email = "demo-full@functionflow.local",
            DisplayName = "Demo User",
        };
        db.Users.Add(staleUser);
        await db.SaveChangesAsync();
        staleUser.CreatedAt = DateTime.UtcNow.AddHours(-2);
        await db.SaveChangesAsync();

        db.Tasks.Add(new TodoTask { Title = "Task", UserId = staleUser.Id, Tags = Array.Empty<string>() });
        db.TaskLists.Add(new TaskList { Name = "List", UserId = staleUser.Id });
        db.AuthCodes.Add(new AuthCode { Email = staleUser.Email, Code = "123456", UserId = staleUser.Id, ExpiresAt = DateTime.UtcNow.AddMinutes(10) });
        db.ApiKeys.Add(new ApiKey { Name = "Key", KeyHash = "abc", KeyPrefix = "ff_", UserId = staleUser.Id });
        await db.SaveChangesAsync();

        await service.CleanupStaleSessions();

        var freshDb = GetDb(provider);
        Assert.Empty(await freshDb.Users.ToListAsync());
        Assert.Empty(await freshDb.Tasks.IgnoreQueryFilters().ToListAsync());
        Assert.Empty(await freshDb.TaskLists.ToListAsync());
        Assert.Empty(await freshDb.AuthCodes.ToListAsync());
        Assert.Empty(await freshDb.ApiKeys.ToListAsync());
    }

    // ── Edge Cases ──

    [Fact(DisplayName = "Cleanup with no stale users is a no-op")]
    public async Task Cleanup_NoStaleUsers_DoesNothing()
    {
        var (service, _, _) = CreateService(maxAgeHours: 24);
        await service.CleanupStaleSessions();
    }

    [Fact(DisplayName = "Cleanup with cancelled token handles gracefully")]
    public async Task Cleanup_CancellationRequested_HandlesGracefully()
    {
        var (service, _, _) = CreateService(maxAgeHours: 24);
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        await service.CleanupStaleSessions(cts.Token);
    }

    [Fact(DisplayName = "Default config values are used when not provided")]
    public async Task Cleanup_DefaultConfigValues_AreUsed()
    {
        var dbName = "CleanupDefaults_" + Guid.NewGuid();
        var provider = new ServiceCollection()
            .AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(dbName), ServiceLifetime.Transient)
            .AddTransient<IUserRepository, EfUserRepository>()
            .AddTransient<ITaskRepository, EfTaskRepository>()
            .AddTransient<IListRepository, EfListRepository>()
            .AddTransient<IAuthCodeRepository, EfAuthCodeRepository>()
            .AddTransient<IApiKeyRepository, EfApiKeyRepository>()
            .BuildServiceProvider();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        var service = new DemoSessionCleanupService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<DemoSessionCleanupService>.Instance,
            config);

        await service.CleanupStaleSessions();
    }

    // ── Background Service Lifecycle ──

    [Fact(DisplayName = "Background service stops gracefully when cancelled")]
    public async Task ExecuteAsync_CancelledQuickly_StopsGracefully()
    {
        var (service, _, _) = CreateService();

        using var cts = new CancellationTokenSource();
        cts.Cancel();

        await service.StartAsync(cts.Token);
        await Task.Delay(50);
        await service.StopAsync(CancellationToken.None);
    }

    [Fact(DisplayName = "Cleanup logs error when service provider lacks dependencies")]
    public async Task CleanupStaleSessions_ExceptionDuringCleanup_LogsError()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DemoCleanup:IntervalMinutes"] = "1",
                ["DemoCleanup:MaxAgeHours"] = "1"
            })
            .Build();

        var provider = new ServiceCollection()
            .BuildServiceProvider();

        var service = new DemoSessionCleanupService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<DemoSessionCleanupService>.Instance,
            config);

        await service.CleanupStaleSessions();
    }
}
