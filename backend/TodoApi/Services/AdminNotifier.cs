namespace TodoApi.Services;

/// <summary>
/// Sends notification emails to a configurable admin address
/// for auditing auth events (sign-ups, logins, demo sessions).
/// </summary>
public interface IAdminNotifier
{
    Task SendAsync(string subject, string body);
}

/// <summary>
/// SMTP-based implementation of <see cref="IAdminNotifier"/>.
/// Silently no-ops when <c>AdminNotify:Email</c> or SMTP credentials are not configured.
/// </summary>
public class AdminNotifier : IAdminNotifier
{
    private readonly IConfiguration _config;
    private readonly ILogger<AdminNotifier> _logger;

    public AdminNotifier(IConfiguration config, ILogger<AdminNotifier> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(string subject, string body)
    {
        var adminEmail = _config["AdminNotify:Email"] ?? "";
        if (string.IsNullOrWhiteSpace(adminEmail))
            return;

        var smtpUser = _config["Smtp:User"] ?? "";
        var smtpPass = _config["Smtp:Pass"] ?? "";

        if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPass))
        {
            _logger.LogInformation("[Admin Notify] {Subject}: {Body}", subject, body);
            return;
        }

        var smtpHost = _config["Smtp:Host"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(_config["Smtp:Port"] ?? "587");
        var fromEmail = _config["Smtp:From"] ?? smtpUser;

        var message = new MimeKit.MimeMessage();
        message.From.Add(new MimeKit.MailboxAddress("FunctionFlow Admin", fromEmail));
        message.To.Add(new MimeKit.MailboxAddress("", adminEmail));
        message.Subject = $"[FunctionFlow] {subject}";
        message.Body = new MimeKit.TextPart("plain") { Text = body };

        try
        {
            using var client = new MailKit.Net.Smtp.SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send admin notification email");
        }
    }
}
