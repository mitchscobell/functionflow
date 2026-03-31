using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using TodoApi.DTOs;

namespace TodoApi.Tests;

public class ProfileTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public ProfileTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> GetAuthTokenAsync(string email)
    {
        await _client.PostAsJsonAsync("/api/auth/request-code", new { email });
        var code = _factory.SentCodes[email];
        var response = await _client.PostAsJsonAsync("/api/auth/verify-code", new { email, code });
        var result = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        return result!.Token;
    }

    // ── Get Profile ──

    [Fact(DisplayName = "Get profile when authenticated returns user data")]
    public async Task GetProfile_Authenticated_ReturnsProfile()
    {
        var token = await GetAuthTokenAsync("profile@example.com");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/profile");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var profile = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal("profile@example.com", profile!.Email);
    }

    // ── Update Profile ──

    [Fact(DisplayName = "Update display name and theme succeeds")]
    public async Task UpdateProfile_ValidInput_ReturnsUpdated()
    {
        var token = await GetAuthTokenAsync("editprofile@example.com");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PutAsJsonAsync("/api/profile", new
        {
            displayName = "New Name",
            themePreference = "dark"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal("New Name", profile!.DisplayName);
        Assert.Equal("dark", profile.ThemePreference);
    }

    [Fact(DisplayName = "Update with invalid theme returns 400")]
    public async Task UpdateProfile_InvalidTheme_ReturnsBadRequest()
    {
        var token = await GetAuthTokenAsync("badtheme@example.com");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PutAsJsonAsync("/api/profile", new
        {
            themePreference = "neon"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact(DisplayName = "Get profile without auth returns 401")]
    public async Task GetProfile_Unauthenticated_ReturnsUnauthorized()
    {
        _client.DefaultRequestHeaders.Authorization = null;
        var response = await _client.GetAsync("/api/profile");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
