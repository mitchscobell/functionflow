using Microsoft.EntityFrameworkCore;
using TodoApi.Data;

namespace TodoApi.Services;

/// <summary>
/// Background service that periodically removes stale demo sessions.
/// Demo accounts (email ending in @functionflow.local) are purged
/// if they were created more than the configured retention period ago.
/// </summary>
public class DemoSessionCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DemoSessionCleanupService> _logger;
    private readonly TimeSpan _interval;
    private readonly TimeSpan _maxAge;

    public DemoSessionCleanupService(
        IServiceScopeFactory scopeFactory,
        ILogger<DemoSessionCleanupService> logger,
        IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _interval = TimeSpan.FromMinutes(
            configuration.GetValue("DemoCleanup:IntervalMinutes", 30));
        _maxAge = TimeSpan.FromHours(
            configuration.GetValue("DemoCleanup:MaxAgeHours", 24));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(_interval, stoppingToken);
            await CleanupStaleSessions(stoppingToken);
        }
    }

    public async Task CleanupStaleSessions(CancellationToken cancellationToken = default)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var cutoff = DateTime.UtcNow - _maxAge;
            var staleUsers = await db.Users
                .Where(u => u.Email.EndsWith("@functionflow.local") && u.CreatedAt < cutoff)
                .ToListAsync(cancellationToken);

            if (staleUsers.Count == 0)
                return;

            foreach (var user in staleUsers)
            {
                var tasks = await db.Tasks.IgnoreQueryFilters()
                    .Where(t => t.UserId == user.Id).ToListAsync(cancellationToken);
                db.Tasks.RemoveRange(tasks);

                var lists = await db.TaskLists
                    .Where(l => l.UserId == user.Id).ToListAsync(cancellationToken);
                db.TaskLists.RemoveRange(lists);

                var codes = await db.AuthCodes
                    .Where(c => c.UserId == user.Id).ToListAsync(cancellationToken);
                db.AuthCodes.RemoveRange(codes);

                var keys = await db.ApiKeys
                    .Where(k => k.UserId == user.Id).ToListAsync(cancellationToken);
                db.ApiKeys.RemoveRange(keys);

                db.Users.Remove(user);
            }

            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Cleaned up {Count} stale demo session(s)", staleUsers.Count);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Shutdown requested — ignore
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up stale demo sessions");
        }
    }
}
