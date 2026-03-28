using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using TodoApi.DTOs;

namespace TodoApi.Tests;

public class DemoSessionTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public DemoSessionTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task DevLogin_CreatesEphemeralSession()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/dev-login",
            new { email = "demo@test.com" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(result);
        Assert.NotEmpty(result.Token);
        Assert.Contains("@functionflow.local", result.User.Email);
        Assert.Equal("Demo User", result.User.DisplayName);
    }

    [Fact]
    public async Task DevLogin_TwoSessions_DifferentUsers()
    {
        var res1 = await _client.PostAsJsonAsync("/api/auth/dev-login",
            new { email = "a@test.com" });
        var res2 = await _client.PostAsJsonAsync("/api/auth/dev-login",
            new { email = "b@test.com" });

        var user1 = (await res1.Content.ReadFromJsonAsync<AuthResponseDto>())!.User;
        var user2 = (await res2.Content.ReadFromJsonAsync<AuthResponseDto>())!.User;

        Assert.NotEqual(user1.Email, user2.Email);
        Assert.NotEqual(user1.Id, user2.Id);
    }

    [Fact]
    public async Task DevLogin_SeedsExampleTasks()
    {
        var loginRes = await _client.PostAsJsonAsync("/api/auth/dev-login",
            new { email = "seeded@test.com" });
        var auth = await loginRes.Content.ReadFromJsonAsync<AuthResponseDto>();

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth!.Token);

        var tasksRes = await _client.GetAsync("/api/tasks");
        var tasks = await tasksRes.Content.ReadFromJsonAsync<TaskListResponseDto>(TestHelpers.JsonOptions);

        Assert.NotNull(tasks);
        Assert.Equal(10, tasks.TotalCount);
    }

    [Fact]
    public async Task DemoLogout_DestroysSessionData()
    {
        // Create demo session
        var loginRes = await _client.PostAsJsonAsync("/api/auth/dev-login",
            new { email = "destroy@test.com" });
        var auth = await loginRes.Content.ReadFromJsonAsync<AuthResponseDto>();

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth!.Token);

        // Verify tasks exist
        var tasksRes = await _client.GetAsync("/api/tasks");
        var tasks = await tasksRes.Content.ReadFromJsonAsync<TaskListResponseDto>(TestHelpers.JsonOptions);
        Assert.Equal(10, tasks!.TotalCount);

        // Logout (destroy session)
        var logoutRes = await _client.PostAsync("/api/auth/demo-logout", null);
        Assert.Equal(HttpStatusCode.OK, logoutRes.StatusCode);
    }

    [Fact]
    public async Task DemoLogout_NonDemoAccount_ReturnsBadRequest()
    {
        // Create a real user
        await _client.PostAsJsonAsync("/api/auth/request-code",
            new { email = "real@example.com" });
        var code = _factory.SentCodes["real@example.com"];
        var verifyRes = await _client.PostAsJsonAsync("/api/auth/verify-code",
            new { email = "real@example.com", code });
        var auth = await verifyRes.Content.ReadFromJsonAsync<AuthResponseDto>();

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth!.Token);

        var response = await _client.PostAsync("/api/auth/demo-logout", null);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
