using System.Net.Http.Json;

namespace TodoApi.Tests;

public class AdminNotifyTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public AdminNotifyTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task RequestCode_SendsAdminNotification()
    {
        var before = _factory.AdminNotifications.Count;

        await _client.PostAsJsonAsync("/api/auth/request-code",
            new { email = "notify-test@example.com" });

        Assert.Contains(_factory.AdminNotifications,
            n => n.Subject == "Code Requested" && n.Body.Contains("notify-test@example.com"));
    }

    [Fact]
    public async Task VerifyCode_SendsLoginNotification()
    {
        var email = "login-notify@example.com";
        await _client.PostAsJsonAsync("/api/auth/request-code", new { email });
        var code = _factory.SentCodes[email];

        await _client.PostAsJsonAsync("/api/auth/verify-code",
            new { email, code, rememberMe = false });

        Assert.Contains(_factory.AdminNotifications,
            n => (n.Subject == "New User Sign-Up" || n.Subject == "User Login")
                 && n.Body.Contains(email));
    }

    [Fact]
    public async Task DevLogin_SendsAdminNotification()
    {
        await _client.PostAsJsonAsync("/api/auth/dev-login",
            new { email = "demo@test.com" });

        Assert.Contains(_factory.AdminNotifications,
            n => n.Subject == "Demo Session Started"
                 && n.Body.Contains("@functionflow.local"));
    }

    [Fact]
    public async Task DemoLogout_SendsAdminNotification()
    {
        // Start a demo session
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/dev-login",
            new { email = "demo@test.com" });
        var result = await loginResponse.Content.ReadFromJsonAsync<AuthResult>();

        // Logout with the demo token
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/demo-logout");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", result!.Token);
        await _client.SendAsync(request);

        Assert.Contains(_factory.AdminNotifications,
            n => n.Subject == "Demo Session Ended"
                 && n.Body.Contains("@functionflow.local"));
    }

    private record AuthResult(string Token, UserResult User);
    private record UserResult(int Id, string Email, string DisplayName, string ThemePreference);
}
