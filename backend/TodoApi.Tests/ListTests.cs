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
}
