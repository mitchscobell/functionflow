using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using TodoApi.DTOs;

namespace TodoApi.Tests;

public class TaskTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public TaskTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> GetAuthTokenAsync(string email = "tasks@example.com")
    {
        await _client.PostAsJsonAsync("/api/auth/request-code", new { email });
        var code = _factory.SentCodes[email];
        var response = await _client.PostAsJsonAsync("/api/auth/verify-code", new { email, code });
        var result = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        return result!.Token;
    }

    private void SetAuth(string token)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    [Fact]
    public async Task GetTasks_Unauthenticated_ReturnsUnauthorized()
    {
        _client.DefaultRequestHeaders.Authorization = null;
        var response = await _client.GetAsync("/api/tasks");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateTask_ValidInput_ReturnsCreated()
    {
        var token = await GetAuthTokenAsync("create@example.com");
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Test Task",
            description = "A test task",
            priority = "Medium",
            tags = new[] { "test" }
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var task = await response.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);
        Assert.NotNull(task);
        Assert.Equal("Test Task", task.Title);
        Assert.Equal("Medium", task.Priority.ToString());
    }

    [Fact]
    public async Task CreateTask_EmptyTitle_ReturnsBadRequest()
    {
        var token = await GetAuthTokenAsync("validate@example.com");
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/tasks", new
        {
            title = "",
            priority = "Medium"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetTask_ExistingTask_ReturnsOk()
    {
        var token = await GetAuthTokenAsync("get@example.com");
        SetAuth(token);

        var createResponse = await _client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Fetch Me",
            priority = "High"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);

        var response = await _client.GetAsync($"/api/tasks/{created!.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var task = await response.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);
        Assert.Equal("Fetch Me", task!.Title);
    }

    [Fact]
    public async Task UpdateTask_ValidInput_ReturnsUpdated()
    {
        var token = await GetAuthTokenAsync("update@example.com");
        SetAuth(token);

        var createResponse = await _client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Original",
            priority = "Low"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);

        var response = await _client.PutAsJsonAsync($"/api/tasks/{created!.Id}", new
        {
            title = "Updated",
            status = "InProgress"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var task = await response.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);
        Assert.Equal("Updated", task!.Title);
        Assert.Equal("InProgress", task.Status.ToString());
    }

    [Fact]
    public async Task DeleteTask_ExistingTask_ReturnsNoContent()
    {
        var token = await GetAuthTokenAsync("delete@example.com");
        SetAuth(token);

        var createResponse = await _client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Delete Me",
            priority = "Medium"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);

        var deleteResponse = await _client.DeleteAsync($"/api/tasks/{created!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Verify soft-delete: task should not be found
        var getResponse = await _client.GetAsync($"/api/tasks/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task GetTask_NonExistent_ReturnsNotFound()
    {
        var token = await GetAuthTokenAsync("notfound@example.com");
        SetAuth(token);

        var response = await _client.GetAsync("/api/tasks/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetTasks_WithSearch_FiltersResults()
    {
        var token = await GetAuthTokenAsync("search@example.com");
        SetAuth(token);

        await _client.PostAsJsonAsync("/api/tasks", new { title = "Buy groceries", priority = "Low" });
        await _client.PostAsJsonAsync("/api/tasks", new { title = "Walk the dog", priority = "Medium" });

        var response = await _client.GetAsync("/api/tasks?search=groceries");
        var result = await response.Content.ReadFromJsonAsync<TaskListResponseDto>(TestHelpers.JsonOptions);

        Assert.NotNull(result);
        Assert.Single(result.Items);
    }

    [Fact]
    public async Task Tasks_UserIsolation_CantSeeOtherUsersTasks()
    {
        // User A creates a task
        var tokenA = await GetAuthTokenAsync("usera@example.com");
        SetAuth(tokenA);
        await _client.PostAsJsonAsync("/api/tasks", new { title = "User A Task", priority = "High" });

        // User B should not see User A's task
        var tokenB = await GetAuthTokenAsync("userb@example.com");
        SetAuth(tokenB);
        var response = await _client.GetAsync("/api/tasks");
        var result = await response.Content.ReadFromJsonAsync<TaskListResponseDto>(TestHelpers.JsonOptions);

        Assert.NotNull(result);
        Assert.DoesNotContain(result.Items, t => t.Title == "User A Task");
    }
}
