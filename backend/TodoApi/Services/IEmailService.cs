namespace TodoApi.Services;

/// <summary>Sends authentication codes to users via email, SMS, or other channels.</summary>
public interface IEmailService
{
    Task SendAuthCodeAsync(string email, string code);
}
