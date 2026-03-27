using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Collections.Concurrent;
using TodoApi.Data;
using TodoApi.Services;

namespace TodoApi.Tests;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    public ConcurrentDictionary<string, string> SentCodes { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
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
