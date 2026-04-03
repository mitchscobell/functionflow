using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using TodoApi.DTOs;

namespace TodoApi.Tests;

public class ListTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public ListTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> GetAuthTokenAsync(string email = "lists@example.com")
    {
        await _client.PostAsJsonAsync("/api/auth/request-code", new { email });
        var code = _factory.SentCodes[email];
        var response = await _client.PostAsJsonAsync("/api/auth/verify-code", new { email, code });
        var result = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        return result!.Token;
    }

    private void SetAuth(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    // ── Create List ──

    [Fact(DisplayName = "Create list with name, emoji, and color returns 201")]
    public async Task CreateList_ValidInput_ReturnsCreated()
    {
        var token = await GetAuthTokenAsync("createlist@example.com");
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/lists", new
        {
            name = "Groceries",
            emoji = "🛒",
            color = "emerald"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var list = await response.Content.ReadFromJsonAsync<ListDto>();
        Assert.NotNull(list);
        Assert.Equal("Groceries", list.Name);
        Assert.Equal("🛒", list.Emoji);
        Assert.Equal("emerald", list.Color);
    }

    [Fact(DisplayName = "Create list with empty name returns 400")]
    public async Task CreateList_EmptyName_ReturnsBadRequest()
    {
        var token = await GetAuthTokenAsync("badlist@example.com");
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/lists", new { name = "" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── Get Lists ──

    [Fact(DisplayName = "Get lists returns all user lists including seeded")]
    public async Task GetLists_ReturnsUserLists()
    {
        var token = await GetAuthTokenAsync("getlists@example.com");
        SetAuth(token);

        await _client.PostAsJsonAsync("/api/lists", new { name = "Errands" });
        await _client.PostAsJsonAsync("/api/lists", new { name = "Fitness" });

        var response = await _client.GetAsync("/api/lists");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var lists = await response.Content.ReadFromJsonAsync<ListDto[]>();
        Assert.NotNull(lists);
        // 3 seeded lists (Work, Personal, Side Project) + 2 created above
        Assert.Equal(5, lists.Length);
    }

    // ── Update List ──

    [Fact(DisplayName = "Update list name and emoji returns updated data")]
    public async Task UpdateList_ValidInput_ReturnsUpdated()
    {
        var token = await GetAuthTokenAsync("updatelist@example.com");
        SetAuth(token);

        var createRes = await _client.PostAsJsonAsync("/api/lists", new { name = "Old Name" });
        var created = await createRes.Content.ReadFromJsonAsync<ListDto>();

        var response = await _client.PutAsJsonAsync($"/api/lists/{created!.Id}", new
        {
            name = "New Name",
            emoji = "📝"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<ListDto>();
        Assert.Equal("New Name", updated!.Name);
        Assert.Equal("📝", updated.Emoji);
    }

    // ── Delete List ──

    [Fact(DisplayName = "Delete list moves its tasks to inbox")]
    public async Task DeleteList_MovesTasksToInbox()
    {
        var token = await GetAuthTokenAsync("deletelist@example.com");
        SetAuth(token);

        // Create list
        var createRes = await _client.PostAsJsonAsync("/api/lists", new { name = "Temp List" });
        var list = await createRes.Content.ReadFromJsonAsync<ListDto>();

        // Create task in list
        await _client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Listed Task",
            priority = "Medium",
            listId = list!.Id
        });

        // Delete list
        var deleteRes = await _client.DeleteAsync($"/api/lists/{list.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteRes.StatusCode);

        // Task should still exist (moved to inbox)
        var tasksRes = await _client.GetAsync("/api/tasks?search=Listed+Task");
        var tasks = await tasksRes.Content.ReadFromJsonAsync<TaskListResponseDto>(TestHelpers.JsonOptions);
        Assert.Single(tasks!.Items);
    }

    // ── User Isolation ──

    [Fact(DisplayName = "Users cannot see other users' lists")]
    public async Task Lists_UserIsolation_CantSeeOtherUsersLists()
    {
        var tokenA = await GetAuthTokenAsync("listusera@example.com");
        SetAuth(tokenA);
        await _client.PostAsJsonAsync("/api/lists", new { name = "User A List" });

        var tokenB = await GetAuthTokenAsync("listuserb@example.com");
        SetAuth(tokenB);
        var response = await _client.GetAsync("/api/lists");
        var lists = await response.Content.ReadFromJsonAsync<ListDto[]>();

        Assert.NotNull(lists);
        Assert.DoesNotContain(lists, l => l.Name == "User A List");
    }

    [Fact(DisplayName = "Users cannot get another user's list by ID")]
    public async Task Lists_UserIsolation_CantGetOtherUsersListById()
    {
        var tokenA = await GetAuthTokenAsync("liso-get-a@example.com");
        SetAuth(tokenA);
        var createRes = await _client.PostAsJsonAsync("/api/lists", new { name = "Secret List" });
        var list = await createRes.Content.ReadFromJsonAsync<ListDto>();

        var tokenB = await GetAuthTokenAsync("liso-get-b@example.com");
        SetAuth(tokenB);
        var response = await _client.GetAsync($"/api/lists/{list!.Id}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact(DisplayName = "Users cannot update another user's list")]
    public async Task Lists_UserIsolation_CantUpdateOtherUsersList()
    {
        var tokenA = await GetAuthTokenAsync("liso-upd-a@example.com");
        SetAuth(tokenA);
        var createRes = await _client.PostAsJsonAsync("/api/lists", new { name = "Protected List" });
        var list = await createRes.Content.ReadFromJsonAsync<ListDto>();

        var tokenB = await GetAuthTokenAsync("liso-upd-b@example.com");
        SetAuth(tokenB);
        var response = await _client.PutAsJsonAsync($"/api/lists/{list!.Id}", new { name = "Hijacked" });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact(DisplayName = "Users cannot delete another user's list")]
    public async Task Lists_UserIsolation_CantDeleteOtherUsersList()
    {
        var tokenA = await GetAuthTokenAsync("liso-del-a@example.com");
        SetAuth(tokenA);
        var createRes = await _client.PostAsJsonAsync("/api/lists", new { name = "Safe List" });
        var list = await createRes.Content.ReadFromJsonAsync<ListDto>();

        var tokenB = await GetAuthTokenAsync("liso-del-b@example.com");
        SetAuth(tokenB);
        var response = await _client.DeleteAsync($"/api/lists/{list!.Id}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact(DisplayName = "Get list by valid ID returns the list")]
    public async Task GetList_ValidId_ReturnsList()
    {
        var token = await GetAuthTokenAsync("getlistbyid@example.com");
        SetAuth(token);

        var createRes = await _client.PostAsJsonAsync("/api/lists", new { name = "Fetch Me" });
        var created = await createRes.Content.ReadFromJsonAsync<ListDto>();

        var response = await _client.GetAsync($"/api/lists/{created!.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var list = await response.Content.ReadFromJsonAsync<ListDto>();
        Assert.NotNull(list);
        Assert.Equal("Fetch Me", list.Name);
    }

    [Fact(DisplayName = "Get list with non-existent ID returns 404")]
    public async Task GetList_NotFound_Returns404()
    {
        var token = await GetAuthTokenAsync("listnotfound@example.com");
        SetAuth(token);

        var response = await _client.GetAsync("/api/lists/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact(DisplayName = "Update non-existent list returns 404")]
    public async Task UpdateList_NotFound_Returns404()
    {
        var token = await GetAuthTokenAsync("listupdate404@example.com");
        SetAuth(token);

        var response = await _client.PutAsJsonAsync("/api/lists/99999", new { name = "X" });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact(DisplayName = "Delete non-existent list returns 404")]
    public async Task DeleteList_NotFound_Returns404()
    {
        var token = await GetAuthTokenAsync("listdelete404@example.com");
        SetAuth(token);

        var response = await _client.DeleteAsync("/api/lists/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact(DisplayName = "Partial update only changes provided fields")]
    public async Task UpdateList_PartialUpdate_OnlyChangesProvidedFields()
    {
        var token = await GetAuthTokenAsync("listpartial@example.com");
        SetAuth(token);

        var createRes = await _client.PostAsJsonAsync("/api/lists",
            new { name = "Original", emoji = "📋", color = "blue" });
        var created = await createRes.Content.ReadFromJsonAsync<ListDto>();

        var response = await _client.PutAsJsonAsync($"/api/lists/{created!.Id}",
            new { color = "red", sortOrder = 5 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<ListDto>();
        Assert.Equal("Original", updated!.Name);
        Assert.Equal("📋", updated.Emoji);
        Assert.Equal("red", updated.Color);
        Assert.Equal(5, updated.SortOrder);
    }

    [Fact(DisplayName = "Create list without color assigns a default")]
    public async Task CreateList_NoColor_AssignsDefault()
    {
        var token = await GetAuthTokenAsync("listnocolor@example.com");
        SetAuth(token);

        var response = await _client.PostAsJsonAsync("/api/lists", new { name = "No Color" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var list = await response.Content.ReadFromJsonAsync<ListDto>();
        Assert.NotNull(list);
        Assert.False(string.IsNullOrEmpty(list.Color));
    }

    [Fact(DisplayName = "Update list with name too long returns 400")]
    public async Task UpdateList_InvalidInput_ReturnsBadRequest()
    {
        var token = await GetAuthTokenAsync("listbadinput@example.com");
        SetAuth(token);

        var createRes = await _client.PostAsJsonAsync("/api/lists", new { name = "Test" });
        var created = await createRes.Content.ReadFromJsonAsync<ListDto>();

        var response = await _client.PutAsJsonAsync($"/api/lists/{created!.Id}",
            new { name = new string('X', 200) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact(DisplayName = "Delete list with soft-deleted tasks returns 204")]
    public async Task DeleteList_WithSoftDeletedTasks_ReturnsNoContent()
    {
        var token = await GetAuthTokenAsync("deletelist-softdel@example.com");
        SetAuth(token);

        // Create list
        var listRes = await _client.PostAsJsonAsync("/api/lists", new { name = "SoftDel List" });
        var list = await listRes.Content.ReadFromJsonAsync<ListDto>();

        // Create a task in that list
        var taskRes = await _client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Task To Soft Delete",
            priority = "Medium",
            listId = list!.Id
        });
        var task = await taskRes.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);

        // Soft-delete the task
        var delTaskRes = await _client.DeleteAsync($"/api/tasks/{task!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delTaskRes.StatusCode);

        // Now delete the list — should succeed, not 500
        var delListRes = await _client.DeleteAsync($"/api/lists/{list.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delListRes.StatusCode);

        // List should be gone
        var getRes = await _client.GetAsync($"/api/lists/{list.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getRes.StatusCode);
    }

    [Fact(DisplayName = "Delete list with mix of active and soft-deleted tasks moves active to inbox")]
    public async Task DeleteList_WithMixedTasks_MovesActiveToInboxAndSucceeds()
    {
        var token = await GetAuthTokenAsync("deletelist-mixed@example.com");
        SetAuth(token);

        // Create list
        var listRes = await _client.PostAsJsonAsync("/api/lists", new { name = "Mixed List" });
        var list = await listRes.Content.ReadFromJsonAsync<ListDto>();

        // Create two tasks
        var task1Res = await _client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Active Task In Mixed",
            priority = "Low",
            listId = list!.Id
        });
        var task1 = await task1Res.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);

        var task2Res = await _client.PostAsJsonAsync("/api/tasks", new
        {
            title = "Deleted Task In Mixed",
            priority = "High",
            listId = list.Id
        });
        var task2 = await task2Res.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);

        // Soft-delete task2
        await _client.DeleteAsync($"/api/tasks/{task2!.Id}");

        // Delete the list
        var delRes = await _client.DeleteAsync($"/api/lists/{list.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delRes.StatusCode);

        // Active task should still exist and have no list (moved to inbox)
        var getTask = await _client.GetAsync($"/api/tasks/{task1!.Id}");
        Assert.Equal(HttpStatusCode.OK, getTask.StatusCode);
        var activeTask = await getTask.Content.ReadFromJsonAsync<TaskDto>(TestHelpers.JsonOptions);
        Assert.Null(activeTask!.ListId);
    }
}
