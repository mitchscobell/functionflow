namespace TodoApi.Services;

/// <summary>
/// Sends notification messages to a configurable admin address
/// for auditing auth events (sign-ups, logins, demo sessions).
/// </summary>
public interface IAdminNotifier
{
    Task SendAsync(string subject, string body);
}
