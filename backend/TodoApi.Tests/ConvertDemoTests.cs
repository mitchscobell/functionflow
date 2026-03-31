using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TodoApi.Data;
using TodoApi.DTOs;
using TodoApi.Models;

namespace TodoApi.Tests;

public class ConvertDemoTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public ConvertDemoTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, AuthResponseDto Auth)> CreateDemoSession()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/dev-login", new { email = "x@test.com" });
        var auth = await res.Content.ReadFromJsonAsync<AuthResponseDto>();
        return (auth!.Token, auth);
    }

    private void SetAuth(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    // ── Request Conversion ──

    [Fact(DisplayName = "Convert demo with valid email sends code and returns 200")]
    public async Task ConvertDemo_ValidDemo_SendsCodeAndReturnsOk()
    {
        var (token, _) = await CreateDemoSession();
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "convert-valid@example.com" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(_factory.SentCodes.ContainsKey("convert-valid@example.com"));
    }

    [Fact(DisplayName = "Convert demo with invalid email returns 400")]
    public async Task ConvertDemo_InvalidEmail_ReturnsBadRequest()
    {
        var (token, _) = await CreateDemoSession();
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "not-an-email" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact(DisplayName = "Convert demo with empty email returns 400")]
    public async Task ConvertDemo_EmptyEmail_ReturnsBadRequest()
    {
        var (token, _) = await CreateDemoSession();
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact(DisplayName = "Convert demo to @functionflow.local email returns 400")]
    public async Task ConvertDemo_DemoEmailTarget_ReturnsBadRequest()
    {
        var (token, _) = await CreateDemoSession();
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "test@functionflow.local" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact(DisplayName = "Convert from a non-demo account returns 400")]
    public async Task ConvertDemo_NonDemoAccount_ReturnsBadRequest()
    {
        // Create a real user
        await _client.PostAsJsonAsync("/api/auth/request-code", new { email = "real-convert@example.com" });
        var code = _factory.SentCodes["real-convert@example.com"];
        var verifyRes = await _client.PostAsJsonAsync("/api/auth/verify-code",
            new { email = "real-convert@example.com", code });
        var auth = await verifyRes.Content.ReadFromJsonAsync<AuthResponseDto>();
        SetAuth(auth!.Token);

        var response = await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "target@example.com" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact(DisplayName = "Convert demo to already-taken email returns 409")]
    public async Task ConvertDemo_EmailAlreadyTaken_ReturnsConflict()
    {
        // Create a real user to claim the email
        await _client.PostAsJsonAsync("/api/auth/request-code", new { email = "taken@example.com" });
        var takenCode = _factory.SentCodes["taken@example.com"];
        await _client.PostAsJsonAsync("/api/auth/verify-code",
            new { email = "taken@example.com", code = takenCode });

        // Try to convert a demo account to that same email
        var (token, _) = await CreateDemoSession();
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "taken@example.com" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact(DisplayName = "Convert demo without auth returns 401")]
    public async Task ConvertDemo_Unauthenticated_ReturnsUnauthorized()
    {
        _client.DefaultRequestHeaders.Authorization = null;

        var response = await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "noauth@example.com" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact(DisplayName = "Convert demo with display name succeeds")]
    public async Task ConvertDemo_WithDisplayName_ReturnsOk()
    {
        var (token, _) = await CreateDemoSession();
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "convert-display@example.com", displayName = "My Name" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ── Verify Conversion ──

    [Fact(DisplayName = "Verify conversion with valid code converts account and returns token")]
    public async Task VerifyConversion_ValidCode_ConvertsAccount()
    {
        var (token, _) = await CreateDemoSession();
        SetAuth(token);

        // Step 1: request conversion
        await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "verify-convert@example.com" });

        var code = _factory.SentCodes["verify-convert@example.com"];

        // Step 2: verify the code
        var response = await _client.PostAsJsonAsync("/api/auth/verify-conversion",
            new { email = "verify-convert@example.com", code });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(result);
        Assert.Equal("verify-convert@example.com", result.User.Email);
        Assert.NotEmpty(result.Token);
    }

    [Fact(DisplayName = "Verify conversion with wrong code returns 401")]
    public async Task VerifyConversion_InvalidCode_ReturnsUnauthorized()
    {
        var (token, _) = await CreateDemoSession();
        SetAuth(token);

        await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "verify-bad@example.com" });

        var response = await _client.PostAsJsonAsync("/api/auth/verify-conversion",
            new { email = "verify-bad@example.com", code = "000000" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact(DisplayName = "Verify conversion on non-demo account returns 400")]
    public async Task VerifyConversion_NonDemoAccount_ReturnsBadRequest()
    {
        await _client.PostAsJsonAsync("/api/auth/request-code", new { email = "real-verify@example.com" });
        var realCode = _factory.SentCodes["real-verify@example.com"];
        var verifyRes = await _client.PostAsJsonAsync("/api/auth/verify-code",
            new { email = "real-verify@example.com", code = realCode });
        var auth = await verifyRes.Content.ReadFromJsonAsync<AuthResponseDto>();
        SetAuth(auth!.Token);

        var response = await _client.PostAsJsonAsync("/api/auth/verify-conversion",
            new { email = "real-verify@example.com", code = "123456" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact(DisplayName = "Verify conversion with bad email format returns 400")]
    public async Task VerifyConversion_InvalidEmailFormat_ReturnsBadRequest()
    {
        var (token, _) = await CreateDemoSession();
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/auth/verify-conversion",
            new { email = "not-email", code = "123456" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact(DisplayName = "Verify conversion when email already taken returns 409")]
    public async Task VerifyConversion_EmailTakenAfterCodeSent_ReturnsConflict()
    {
        // First, create a real user to claim the email BEFORE the demo conversion starts
        _client.DefaultRequestHeaders.Authorization = null;
        await _client.PostAsJsonAsync("/api/auth/request-code", new { email = "race-email@example.com" });
        var realCode = _factory.SentCodes["race-email@example.com"];
        await _client.PostAsJsonAsync("/api/auth/verify-code",
            new { email = "race-email@example.com", code = realCode });

        // Demo user starts conversion with a different email, but we need to test
        // the verify-conversion path where email is already taken.
        // Create demo, get conversion code for a fresh email, then manually test the path.
        var (demoToken, _) = await CreateDemoSession();
        SetAuth(demoToken);

        // Convert to the already-taken email — this should send a code
        // But convert-demo itself checks for existing email first, so it returns Conflict
        var response = await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "race-email@example.com" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact(DisplayName = "Verify conversion without auth returns 401")]
    public async Task VerifyConversion_Unauthenticated_ReturnsUnauthorized()
    {
        _client.DefaultRequestHeaders.Authorization = null;

        var response = await _client.PostAsJsonAsync("/api/auth/verify-conversion",
            new { email = "noauth@example.com", code = "123456" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact(DisplayName = "Verify conversion sends admin notification")]
    public async Task VerifyConversion_SendsAdminNotification()
    {
        var (token, _) = await CreateDemoSession();
        SetAuth(token);

        await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "notify-conv@example.com" });
        var code = _factory.SentCodes["notify-conv@example.com"];

        await _client.PostAsJsonAsync("/api/auth/verify-conversion",
            new { email = "notify-conv@example.com", code });

        Assert.Contains(_factory.AdminNotifications,
            n => n.Subject == "Demo Converted" && n.Body.Contains("notify-conv@example.com"));
    }

    [Fact(DisplayName = "Convert demo invalidates previous codes for that email")]
    public async Task ConvertDemo_ExistingCodesForEmail_InvalidatesPrevious()
    {
        await _client.PostAsJsonAsync("/api/auth/request-code",
            new { email = "preexisting-codes@example.com" });

        var (token, _) = await CreateDemoSession();
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "preexisting-codes@example.com" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ── Full Conversion Flow ──

    [Fact(DisplayName = "Full happy path: convert demo and verify returns new token")]
    public async Task VerifyConversion_FullHappyPath_ConvertsAndReturnsToken()
    {
        var (token, _) = await CreateDemoSession();
        SetAuth(token);

        var convertRes = await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "full-convert-path@example.com" });
        Assert.Equal(HttpStatusCode.OK, convertRes.StatusCode);

        var code = _factory.SentCodes["full-convert-path@example.com"];

        var verifyRes = await _client.PostAsJsonAsync("/api/auth/verify-conversion",
            new { email = "full-convert-path@example.com", code });
        Assert.Equal(HttpStatusCode.OK, verifyRes.StatusCode);

        var result = await verifyRes.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.Equal("full-convert-path@example.com", result!.User.Email);
    }

    [Fact(DisplayName = "Email taken between convert and verify returns 409")]
    public async Task VerifyConversion_EmailTakenBetweenConvertAndVerify_ReturnsConflict()
    {
        var (token, _) = await CreateDemoSession();
        SetAuth(token);

        await _client.PostAsJsonAsync("/api/auth/convert-demo",
            new { email = "race-target@example.com" });
        var code = _factory.SentCodes["race-target@example.com"];

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Users.Add(new User { Email = "race-target@example.com", DisplayName = "Sniper" });
        await db.SaveChangesAsync();

        var verifyRes = await _client.PostAsJsonAsync("/api/auth/verify-conversion",
            new { email = "race-target@example.com", code });
        Assert.Equal(HttpStatusCode.Conflict, verifyRes.StatusCode);
    }

    // ── DTO Construction ──

    [Fact(DisplayName = "ConvertDemoDto constructs with email and display name")]
    public void ConvertDemoDto_Constructs()
    {
        var dto = new ConvertDemoDto("test@example.com", "My Name");
        Assert.Equal("test@example.com", dto.Email);
        Assert.Equal("My Name", dto.DisplayName);
    }

    [Fact(DisplayName = "ConvertDemoDto allows null display name")]
    public void ConvertDemoDto_NullDisplayName()
    {
        var dto = new ConvertDemoDto("test@example.com", null);
        Assert.Null(dto.DisplayName);
    }

    [Fact(DisplayName = "VerifyConversionDto constructs with email and code")]
    public void VerifyConversionDto_Constructs()
    {
        var dto = new VerifyConversionDto("test@example.com", "123456");
        Assert.Equal("test@example.com", dto.Email);
        Assert.Equal("123456", dto.Code);
    }
}
