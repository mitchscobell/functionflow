using System.Net;
using System.Net.Http.Json;
using TodoApi.DTOs;

namespace TodoApi.Tests;

public class AuthTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public AuthTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task RequestCode_ValidEmail_ReturnsOk()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/request-code",
            new { email = "test@example.com" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task RequestCode_InvalidEmail_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/request-code",
            new { email = "not-an-email" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RequestCode_EmptyEmail_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/request-code",
            new { email = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task VerifyCode_InvalidCode_ReturnsUnauthorized()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/verify-code",
            new { email = "test@example.com", code = "000000" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task VerifyCode_InvalidFormat_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/verify-code",
            new { email = "test@example.com", code = "abc" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task FullAuthFlow_RequestAndVerify_ReturnsToken()
    {
        // Request code
        await _client.PostAsJsonAsync("/api/auth/request-code",
            new { email = "flow@example.com" });

        // Get the code from the fake email service
        Assert.True(_factory.SentCodes.TryGetValue("flow@example.com", out var code));

        // Verify code
        var verifyResponse = await _client.PostAsJsonAsync("/api/auth/verify-code",
            new { email = "flow@example.com", code });

        Assert.Equal(HttpStatusCode.OK, verifyResponse.StatusCode);

        var result = await verifyResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(result);
        Assert.NotEmpty(result.Token);
        Assert.Equal("flow@example.com", result.User.Email);
    }

    [Fact]
    public async Task VerifyCode_UsedCode_ReturnsUnauthorized()
    {
        // Request and use a code
        await _client.PostAsJsonAsync("/api/auth/request-code",
            new { email = "reuse@example.com" });

        var code = _factory.SentCodes["reuse@example.com"];

        await _client.PostAsJsonAsync("/api/auth/verify-code",
            new { email = "reuse@example.com", code });

        // Try to use the same code again
        var response = await _client.PostAsJsonAsync("/api/auth/verify-code",
            new { email = "reuse@example.com", code });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
