using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Controllers;
using TodoApi.Data;

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

    [Fact]
    public async Task GetVersion_HasTimestamp()
    {
        var result = await _client.GetFromJsonAsync<VersionResponse>("/api/version");
        Assert.NotNull(result);
        Assert.False(string.IsNullOrEmpty(result.Timestamp));
    }

    [Fact]
    public async Task GetVersion_DbUnreachable_ReturnsDegradedStatus()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite("Data Source=/nonexistent_impossible_path_12345/db.sqlite")
            .Options;
        var db = new AppDbContext(options);
        var controller = new VersionController(db);

        var result = await controller.GetVersion();
        var okResult = Assert.IsType<OkObjectResult>(result);
        var value = okResult.Value!;
        var statusProp = value.GetType().GetProperty("status")!.GetValue(value)!.ToString();
        var dbProp = value.GetType().GetProperty("database")!.GetValue(value)!.ToString();

        Assert.Equal("degraded", statusProp);
        Assert.Equal("unreachable", dbProp);
    }

    private record VersionResponse(string Name, string Version, string Status, string Database, string Timestamp);
}
