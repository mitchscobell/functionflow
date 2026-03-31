using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using TodoApi.Services;

namespace TodoApi.Tests;

public class SmtpServiceTests
{
    // ── SmtpEmailService ──

    private static SmtpEmailService CreateEmailService(Dictionary<string, string?>? settings = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(settings ?? new Dictionary<string, string?>())
            .Build();
        return new SmtpEmailService(config, NullLogger<SmtpEmailService>.Instance);
    }

    [Fact(DisplayName = "Email service with no SMTP credentials logs warning and returns")]
    public async Task EmailService_NoSmtpCredentials_LogsWarningAndReturns()
    {
        var service = CreateEmailService();

        // Should not throw — falls back to logging
        await service.SendAuthCodeAsync("test@example.com", "123456");
    }

    [Fact(DisplayName = "Email service with empty SMTP user logs warning")]
    public async Task EmailService_EmptyUser_LogsWarningAndReturns()
    {
        var service = CreateEmailService(new Dictionary<string, string?>
        {
            ["Smtp:User"] = "",
            ["Smtp:Pass"] = "somepass"
        });

        await service.SendAuthCodeAsync("test@example.com", "123456");
    }

    [Fact(DisplayName = "Email service with empty SMTP password logs warning")]
    public async Task EmailService_EmptyPass_LogsWarningAndReturns()
    {
        var service = CreateEmailService(new Dictionary<string, string?>
        {
            ["Smtp:User"] = "user@example.com",
            ["Smtp:Pass"] = ""
        });

        await service.SendAuthCodeAsync("test@example.com", "123456");
    }

    [Fact(DisplayName = "Email service with custom SMTP settings attempts connection")]
    public async Task EmailService_WithCustomSmtpSettings_ReadsConfig()
    {
        // Configured but will fail to connect (no real server) — validates the code path
        // that reads config and attempts SMTP. We catch the expected connection failure.
        var service = CreateEmailService(new Dictionary<string, string?>
        {
            ["Smtp:Host"] = "localhost",
            ["Smtp:Port"] = "12345",
            ["Smtp:User"] = "user@test.com",
            ["Smtp:Pass"] = "pass123",
            ["Smtp:From"] = "from@test.com"
        });

        // This will attempt a real SMTP connection that will fail
        await Assert.ThrowsAnyAsync<Exception>(
            () => service.SendAuthCodeAsync("dest@example.com", "654321"));
    }

    // ── SmtpAdminNotifier ──

    private static SmtpAdminNotifier CreateAdminNotifier(Dictionary<string, string?>? settings = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(settings ?? new Dictionary<string, string?>())
            .Build();
        return new SmtpAdminNotifier(config, NullLogger<SmtpAdminNotifier>.Instance);
    }

    [Fact(DisplayName = "Admin notifier with no admin email returns immediately")]
    public async Task AdminNotifier_NoAdminEmail_ReturnsImmediately()
    {
        var notifier = CreateAdminNotifier();

        // Should not throw — no-ops when AdminNotify:Email is not set
        await notifier.SendAsync("Subject", "Body");
    }

    [Fact(DisplayName = "Admin notifier with empty admin email returns immediately")]
    public async Task AdminNotifier_EmptyAdminEmail_ReturnsImmediately()
    {
        var notifier = CreateAdminNotifier(new Dictionary<string, string?>
        {
            ["AdminNotify:Email"] = "  "
        });

        await notifier.SendAsync("Subject", "Body");
    }

    [Fact(DisplayName = "Admin notifier with admin email but no SMTP credentials logs")]
    public async Task AdminNotifier_AdminEmailSet_NoSmtpCredentials_Logs()
    {
        var notifier = CreateAdminNotifier(new Dictionary<string, string?>
        {
            ["AdminNotify:Email"] = "admin@example.com",
            ["Smtp:User"] = "",
            ["Smtp:Pass"] = ""
        });

        // Falls back to logging when SMTP not configured
        await notifier.SendAsync("Test Subject", "Test Body");
    }

    [Fact(DisplayName = "Admin notifier with admin email but no SMTP user logs")]
    public async Task AdminNotifier_AdminEmailSet_NoSmtpUser_Logs()
    {
        var notifier = CreateAdminNotifier(new Dictionary<string, string?>
        {
            ["AdminNotify:Email"] = "admin@example.com"
        });

        await notifier.SendAsync("Test Subject", "Test Body");
    }

    [Fact(DisplayName = "Admin notifier with full config catches SMTP failures gracefully")]
    public async Task AdminNotifier_FullConfig_FailsGracefully()
    {
        // With full config but unreachable SMTP server, should catch and log
        var notifier = CreateAdminNotifier(new Dictionary<string, string?>
        {
            ["AdminNotify:Email"] = "admin@example.com",
            ["Smtp:User"] = "user@test.com",
            ["Smtp:Pass"] = "pass123",
            ["Smtp:Host"] = "localhost",
            ["Smtp:Port"] = "12345",
            ["Smtp:From"] = "from@test.com"
        });

        // Should NOT throw — the catch block in SendAsync handles it
        await notifier.SendAsync("Test", "Body");
    }
}
