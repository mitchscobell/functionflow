using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using TodoApi.DTOs;

namespace TodoApi.Tests;

public class ApiKeyTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public ApiKeyTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> GetAuthTokenAsync(string email = "apikey@example.com")
    {
        await _client.PostAsJsonAsync("/api/auth/request-code", new { email });
        var code = _factory.SentCodes[email];
        var response = await _client.PostAsJsonAsync("/api/auth/verify-code", new { email, code });
        var result = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        return result!.Token;
    }

    private void SetAuth(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    [Fact]
    public async Task CreateKey_ValidInput_ReturnsKeyOnce()
    {
        var token = await GetAuthTokenAsync("createkey@example.com");
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/keys", new { name = "My Key" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var key = await response.Content.ReadFromJsonAsync<ApiKeyCreatedDto>();
        Assert.NotNull(key);
        Assert.Equal("My Key", key.Name);
        Assert.StartsWith("ff_", key.Key);
        Assert.Equal(key.Key[..11], key.KeyPrefix);
    }

    [Fact]
    public async Task GetKeys_ReturnsOnlyPrefixes()
    {
        var token = await GetAuthTokenAsync("listkeys@example.com");
        SetAuth(token);

        await _client.PostAsJsonAsync("/api/keys", new { name = "Key 1" });

        var response = await _client.GetAsync("/api/keys");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var keys = await response.Content.ReadFromJsonAsync<ApiKeyDto[]>();
        Assert.NotNull(keys);
        Assert.Single(keys);
        Assert.Equal("Key 1", keys[0].Name);
        Assert.True(keys[0].KeyPrefix.Length <= 20);
    }

    [Fact]
    public async Task RevokeKey_ReturnsNoContent()
    {
        var token = await GetAuthTokenAsync("revokekey@example.com");
        SetAuth(token);

        var createRes = await _client.PostAsJsonAsync("/api/keys", new { name = "Revokable" });
        var created = await createRes.Content.ReadFromJsonAsync<ApiKeyCreatedDto>();

        var response = await _client.DeleteAsync($"/api/keys/{created!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task ApiKeyAuth_ValidKey_CanAccessTasks()
    {
        var token = await GetAuthTokenAsync("keyauth@example.com");
        SetAuth(token);

        // Create an API key
        var createRes = await _client.PostAsJsonAsync("/api/keys", new { name = "Task Key" });
        var created = await createRes.Content.ReadFromJsonAsync<ApiKeyCreatedDto>();

        // Use API key instead of JWT
        _client.DefaultRequestHeaders.Authorization = null;
        _client.DefaultRequestHeaders.Add("X-Api-Key", created!.Key);

        var response = await _client.GetAsync("/api/tasks");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Clean up
        _client.DefaultRequestHeaders.Remove("X-Api-Key");
    }

    [Fact]
    public async Task ApiKeyAuth_InvalidKey_ReturnsUnauthorized()
    {
        _client.DefaultRequestHeaders.Authorization = null;
        _client.DefaultRequestHeaders.Remove("X-Api-Key");
        _client.DefaultRequestHeaders.Add("X-Api-Key", "ff_invalidkey12345");

        var response = await _client.GetAsync("/api/tasks");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        _client.DefaultRequestHeaders.Remove("X-Api-Key");
    }

    [Fact]
    public async Task CreateKey_EmptyName_ReturnsBadRequest()
    {
        var token = await GetAuthTokenAsync("badkey@example.com");
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/keys", new { name = "" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
