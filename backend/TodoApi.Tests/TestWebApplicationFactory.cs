using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Collections.Concurrent;
using TodoApi.Data;
using TodoApi.Services;

namespace TodoApi.Tests;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    public ConcurrentDictionary<string, string> SentCodes { get; } = new();
    public ConcurrentBag<(string Subject, string Body)> AdminNotifications { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.UseSetting("Jwt:Key", "TestOnlyKey_MinimumLength32Characters!");

        builder.ConfigureServices(services =>
        {
            // Remove the background cleanup service so it doesn't interfere with tests
            var hostedServiceDescriptors = services
                .Where(d => d.ImplementationType == typeof(DemoSessionCleanupService))
                .ToList();
            foreach (var d in hostedServiceDescriptors)
                services.Remove(d);
            // Remove real DbContext
            var dbDescriptors = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>))
                .ToList();
            foreach (var d in dbDescriptors)
                services.Remove(d);

            var dbName = "TestDb_" + Guid.NewGuid();
            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(dbName));

            // Remove real email service and replace with fake
            var emailDescriptors = services
                .Where(d => d.ServiceType == typeof(IEmailService))
                .ToList();
            foreach (var d in emailDescriptors)
                services.Remove(d);
            services.AddSingleton<IEmailService>(new FakeEmailService(SentCodes));

            // Remove real admin notifier and replace with fake
            var notifierDescriptors = services
                .Where(d => d.ServiceType == typeof(IAdminNotifier))
                .ToList();
            foreach (var d in notifierDescriptors)
                services.Remove(d);
            services.AddSingleton<IAdminNotifier>(new FakeAdminNotifier(AdminNotifications));
        });
    }
}

public class FakeEmailService : IEmailService
{
    private readonly ConcurrentDictionary<string, string> _sentCodes;

    public FakeEmailService(ConcurrentDictionary<string, string> sentCodes)
    {
        _sentCodes = sentCodes;
    }

    public Task SendAuthCodeAsync(string email, string code)
    {
        _sentCodes[email] = code;
        return Task.CompletedTask;
    }
}

public class FakeAdminNotifier : IAdminNotifier
{
    private readonly ConcurrentBag<(string Subject, string Body)> _notifications;

    public FakeAdminNotifier(ConcurrentBag<(string Subject, string Body)> notifications)
    {
        _notifications = notifications;
    }

    public Task SendAsync(string subject, string body)
    {
        _notifications.Add((subject, body));
        return Task.CompletedTask;
    }
}
