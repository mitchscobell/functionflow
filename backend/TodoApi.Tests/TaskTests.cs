using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using TodoApi.DTOs;
using TodoApi.Models;

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

    // ── Authentication ──

    [Fact(DisplayName = "GET /tasks without auth returns 401")]
    public async Task GetTasks_Unauthenticated_ReturnsUnauthorized()
    {
        _client.DefaultRequestHeaders.Authorization = null;
        var response = await _client.GetAsync("/api/tasks");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Create Task ──

    [Fact(DisplayName = "Create task with valid input returns 201 with correct data")]
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

    [Fact(DisplayName = "Create task with empty title returns 400")]
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

    // ── Get Task ──

    [Fact(DisplayName = "Get existing task by ID returns task details")]
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

    // ── Update Task ──

    [Fact(DisplayName = "Update task title and status returns updated data")]
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

    // ── Delete Task ──

    [Fact(DisplayName = "Delete task soft-deletes and returns 204")]
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

    [Fact(DisplayName = "Get non-existent task returns 404")]
    public async Task GetTask_NonExistent_ReturnsNotFound()
    {
        var token = await GetAuthTokenAsync("notfound@example.com");
        SetAuth(token);

        var response = await _client.GetAsync("/api/tasks/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── Search & Sort ──

    [Fact(DisplayName = "Search tasks filters by keyword in title")]
    public async Task GetTasks_WithSearch_FiltersResults()
    {
        var token = await GetAuthTokenAsync("search@example.com");
        SetAuth(token);

        await _client.PostAsJsonAsync("/api/tasks", new { title = "Unique flamingo task", priority = "Low" });
        await _client.PostAsJsonAsync("/api/tasks", new { title = "Walk the dog", priority = "Medium" });

        var response = await _client.GetAsync("/api/tasks?search=flamingo");
        var result = await response.Content.ReadFromJsonAsync<TaskListResponseDto>(TestHelpers.JsonOptions);

        Assert.NotNull(result);
        Assert.Single(result.Items);
    }

    // ── User Isolation ──

    [Fact(DisplayName = "Users cannot see other users' tasks")]
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

    [Fact(DisplayName = "Update all task fields at once succeeds")]
    public async Task UpdateTask_AllFields_ReturnsUpdated()
    {
        var token = await GetAuthTokenAsync("updateallfields@example.com");
        SetAuth(token);

        var createRes = await _client.PostAsJsonAsync("/api/tasks",
            new { title = "Base Task", priority = "Low" });
        var created = await createRes.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);

        var response = await _client.PutAsJsonAsync($"/api/tasks/{created!.Id}", new
        {
            title = "Updated",
            description = "Updated desc",
            notes = "My notes",
            url = "https://example.com",
            priority = "High",
            status = "Done",
            tags = new[] { "updated" },
            dueDate = DateTime.UtcNow.AddDays(5).ToString("o")
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var task = await response.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);
        Assert.Equal("Updated", task!.Title);
        Assert.Equal("Updated desc", task.Description);
    }

    [Fact(DisplayName = "Create task with all optional fields returns 201")]
    public async Task CreateTask_WithAllOptionalFields_ReturnsCreated()
    {
        var token = await GetAuthTokenAsync("fulltask@example.com");
        SetAuth(token);

        var listRes = await _client.PostAsJsonAsync("/api/lists", new { name = "For Task" });
        var list = await listRes.Content.ReadFromJsonAsync<ListDto>();

        var response = await _client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Full Task",
            description = "A description",
            notes = "Some notes",
            url = "https://example.com/task",
            priority = "High",
            tags = new[] { "a", "b" },
            dueDate = DateTime.UtcNow.AddDays(3).ToString("o"),
            listId = list!.Id
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact(DisplayName = "Sort tasks by title ascending")]
    public async Task GetTasks_SortByTitle_ReturnsSorted()
    {
        var token = await GetAuthTokenAsync("sorttasks@example.com");
        SetAuth(token);

        await _client.PostAsJsonAsync("/api/tasks", new { title = "Zebra", priority = "Low" });
        await _client.PostAsJsonAsync("/api/tasks", new { title = "Apple", priority = "Low" });

        var response = await _client.GetAsync("/api/tasks?sortBy=title&sortDir=asc");
        var result = await response.Content.ReadFromJsonAsync<TaskListResponseDto>(TestHelpers.JsonOptions);
        var titles = result!.Items.Select(t => t.Title).ToList();
        Assert.True(titles.IndexOf("Apple") < titles.IndexOf("Zebra"));
    }

    [Fact(DisplayName = "Sort tasks by priority descending")]
    public async Task GetTasks_SortByPriority_ReturnsSorted()
    {
        var token = await GetAuthTokenAsync("sortpri@example.com");
        SetAuth(token);

        await _client.PostAsJsonAsync("/api/tasks", new { title = "Low Task", priority = "Low" });
        await _client.PostAsJsonAsync("/api/tasks", new { title = "High Task", priority = "High" });

        var response = await _client.GetAsync("/api/tasks?sortBy=priority&sortDir=desc");
        var result = await response.Content.ReadFromJsonAsync<TaskListResponseDto>(TestHelpers.JsonOptions);
        // First item should be High priority (could be seeded or test-created)
        Assert.Equal(TaskPriority.High, result!.Items.First().Priority);
    }

    [Fact(DisplayName = "Update task with invalid URL returns 400")]
    public async Task UpdateTask_InvalidUrl_ReturnsBadRequest()
    {
        var token = await GetAuthTokenAsync("taskbadurl@example.com");
        SetAuth(token);

        var createRes = await _client.PostAsJsonAsync("/api/tasks",
            new { title = "URL Task", priority = "Low" });
        var created = await createRes.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);

        var response = await _client.PutAsJsonAsync($"/api/tasks/{created!.Id}",
            new { url = "not-a-url" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact(DisplayName = "Update task with more than 10 tags returns 400")]
    public async Task UpdateTask_TooManyTags_ReturnsBadRequest()
    {
        var token = await GetAuthTokenAsync("tasktags@example.com");
        SetAuth(token);

        var createRes = await _client.PostAsJsonAsync("/api/tasks",
            new { title = "Tags Task", priority = "Low" });
        var created = await createRes.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);

        var response = await _client.PutAsJsonAsync($"/api/tasks/{created!.Id}",
            new { tags = Enumerable.Range(0, 11).Select(i => $"tag{i}").ToArray() });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── Update Task List Assignment ──

    [Fact(DisplayName = "Update task to assign a list ID")]
    public async Task UpdateTask_SetListId_AssignsList()
    {
        var token = await GetAuthTokenAsync("updatelistid@example.com");
        SetAuth(token);

        var listRes = await _client.PostAsJsonAsync("/api/lists", new { name = "Target List" });
        var list = await listRes.Content.ReadFromJsonAsync<ListDto>();

        var createRes = await _client.PostAsJsonAsync("/api/tasks",
            new { title = "No List Task", priority = "Low" });
        var created = await createRes.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);
        Assert.Null(created!.ListId);

        var response = await _client.PutAsJsonAsync($"/api/tasks/{created.Id}",
            new { listId = list!.Id });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);
        Assert.Equal(list.Id, updated!.ListId);
    }

    [Fact(DisplayName = "Update task with listId=0 clears the list assignment")]
    public async Task UpdateTask_SetListIdToZero_ClearsList()
    {
        var token = await GetAuthTokenAsync("clearlistid@example.com");
        SetAuth(token);

        var listRes = await _client.PostAsJsonAsync("/api/lists", new { name = "Temp List" });
        var list = await listRes.Content.ReadFromJsonAsync<ListDto>();

        var createRes = await _client.PostAsJsonAsync("/api/tasks",
            new { title = "Listed Task", priority = "Low", listId = list!.Id });
        var created = await createRes.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);
        Assert.Equal(list.Id, created!.ListId);

        var response = await _client.PutAsJsonAsync($"/api/tasks/{created.Id}",
            new { listId = 0 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);
        Assert.Null(updated!.ListId);
    }

    [Fact(DisplayName = "Update task with non-existent list ID returns 400")]
    public async Task UpdateTask_InvalidListId_ReturnsBadRequest()
    {
        var token = await GetAuthTokenAsync("updatebadlist@example.com");
        SetAuth(token);

        var createRes = await _client.PostAsJsonAsync("/api/tasks",
            new { title = "Bad List Task", priority = "Low" });
        var created = await createRes.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);

        var response = await _client.PutAsJsonAsync($"/api/tasks/{created!.Id}",
            new { listId = 99999 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact(DisplayName = "Create task with invalid list ID returns 400")]
    public async Task CreateTask_InvalidListId_ReturnsBadRequest()
    {
        var token = await GetAuthTokenAsync("createbadlist@example.com");
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/tasks",
            new { title = "Task With Bad List", priority = "Low", listId = 99999 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── Model Properties ──

    [Fact(DisplayName = "TodoTask model properties can all be set and read")]
    public void TodoTask_AllProperties_CanBeSet()
    {
        var now = DateTime.UtcNow;
        var task = new TodoTask
        {
            Id = 1,
            Title = "Test",
            Description = "Desc",
            Notes = "My notes",
            Url = "https://example.com",
            DueDate = now,
            Priority = TaskPriority.High,
            Status = Models.TaskStatus.InProgress,
            Tags = new[] { "a", "b" },
            UserId = 42,
            ListId = 5,
            IsDeleted = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        Assert.Equal("My notes", task.Notes);
        Assert.Equal("https://example.com", task.Url);
        Assert.Equal(5, task.ListId);
        Assert.Equal(now, task.DueDate);
    }

    [Fact(DisplayName = "TodoTask default values are correct")]
    public void TodoTask_DefaultValues_AreCorrect()
    {
        var task = new TodoTask();

        Assert.Equal(string.Empty, task.Title);
        Assert.Null(task.Description);
        Assert.Null(task.Notes);
        Assert.Null(task.Url);
        Assert.Null(task.DueDate);
        Assert.Equal(TaskPriority.Medium, task.Priority);
        Assert.Equal(Models.TaskStatus.Todo, task.Status);
        Assert.Empty(task.Tags);
        Assert.Null(task.ListId);
        Assert.False(task.IsDeleted);
    }

    [Fact(DisplayName = "TodoTask List navigation property works")]
    public void TodoTask_ListNavigation_CanBeSetAndRead()
    {
        var list = new TaskList { Id = 1, Name = "Work", UserId = 1 };
        var task = new TodoTask
        {
            Title = "Test",
            ListId = list.Id,
            List = list
        };

        Assert.NotNull(task.List);
        Assert.Equal("Work", task.List.Name);
    }

    [Fact(DisplayName = "TodoTask User navigation property works")]
    public void TodoTask_UserNavigation_CanBeSetAndRead()
    {
        var user = new User { Id = 1, Email = "test@test.com", DisplayName = "Test" };
        var task = new TodoTask
        {
            Title = "Test",
            UserId = user.Id,
            User = user
        };

        Assert.NotNull(task.User);
        Assert.Equal("test@test.com", task.User.Email);
    }
}
