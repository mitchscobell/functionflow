namespace TodoApi.Services;

/// <summary>
/// SMTP-based implementation of <see cref="IEmailService"/>.
/// Falls back to logging when SMTP is not configured.
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAuthCodeAsync(string email, string code)
    {
        var smtpHost = _config["Smtp:Host"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(_config["Smtp:Port"] ?? "587");
        var smtpUser = _config["Smtp:User"] ?? "";
        var smtpPass = _config["Smtp:Pass"] ?? "";
        var fromEmail = _config["Smtp:From"] ?? smtpUser;

        // If SMTP is not configured, log the code for development
        if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPass))
        {
            _logger.LogWarning("SMTP not configured. Auth code was not sent to {Email}", email);
            return;
        }

        var message = new MimeKit.MimeMessage();
        message.From.Add(new MimeKit.MailboxAddress("FunctionFlow", fromEmail));
        message.To.Add(new MimeKit.MailboxAddress("", email));
        message.Subject = "Your FunctionFlow Login Code";
        message.Body = new MimeKit.TextPart("html")
        {
            Text = $"""
                <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
                    <h2 style="color: #B67B5E;">FunctionFlow</h2>
                    <p>Your login code is:</p>
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #FEF9EF; text-align: center; border-radius: 8px; margin: 16px 0;">
                        {code}
                    </div>
                    <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
                </div>
                """
        };

        using var client = new MailKit.Net.Smtp.SmtpClient();
        await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(smtpUser, smtpPass);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);

        _logger.LogInformation("Auth code sent to {Email}", email);
    }
}
