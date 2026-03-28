using System.Net;
using System.Net.Http.Json;

namespace TodoApi.Tests;

public class VersionTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;

    public VersionTests(TestWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetVersion_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/version");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetVersion_ReturnsExpectedShape()
    {
        var result = await _client.GetFromJsonAsync<VersionResponse>("/api/version");

        Assert.NotNull(result);
        Assert.Equal("FunctionFlow API", result.Name);
        Assert.False(string.IsNullOrEmpty(result.Version));
        Assert.Equal("healthy", result.Status);
        Assert.Equal("connected", result.Database);
    }

    [Fact]
    public async Task GetVersion_DoesNotRequireAuth()
    {
        // Use a fresh client with no auth headers
        var client = new HttpClient { BaseAddress = _client.BaseAddress };
        // Need to use the factory's handler
        var response = await _client.GetAsync("/api/version");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private record VersionResponse(string Name, string Version, string Status, string Database, string Timestamp);
}
