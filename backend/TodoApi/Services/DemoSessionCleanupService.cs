using TodoApi.Repositories;

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
            var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
            var tasks = scope.ServiceProvider.GetRequiredService<ITaskRepository>();
            var lists = scope.ServiceProvider.GetRequiredService<IListRepository>();
            var authCodes = scope.ServiceProvider.GetRequiredService<IAuthCodeRepository>();
            var apiKeys = scope.ServiceProvider.GetRequiredService<IApiKeyRepository>();

            var staleUsers = (await users.GetStaleDemoUsersAsync(_maxAge)).ToList();

            if (staleUsers.Count == 0)
                return;

            foreach (var user in staleUsers)
            {
                await tasks.DeleteAllByUserIdAsync(user.Id);
                await lists.DeleteAllByUserIdAsync(user.Id);
                await authCodes.DeleteByUserIdAsync(user.Id);
                await apiKeys.DeleteByUserIdAsync(user.Id);
                await users.DeleteAsync(user);
            }

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
