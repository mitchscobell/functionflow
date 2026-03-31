using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;
using TodoApi.Repositories;

namespace TodoApi.Tests;

public class RepositoryTests
{
    private static (AppDbContext db, EfTaskRepository tasks, EfListRepository lists,
        EfUserRepository users, EfAuthCodeRepository authCodes, EfApiKeyRepository apiKeys) CreateRepos()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("RepoTest_" + Guid.NewGuid())
            .Options;
        var db = new AppDbContext(options);
        return (db,
            new EfTaskRepository(db),
            new EfListRepository(db),
            new EfUserRepository(db),
            new EfAuthCodeRepository(db),
            new EfApiKeyRepository(db));
    }

    private static async Task<User> SeedUser(AppDbContext db, string email = "test@example.com")
    {
        var user = new User { Email = email, DisplayName = "Test" };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    // ── Task Repository: CRUD ──

    [Fact(DisplayName = "Create and retrieve a task by ID")]
    public async Task TaskRepo_CreateAndGet_RoundTrips()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        var task = new TodoTask { Title = "Buy milk", UserId = user.Id, Tags = Array.Empty<string>() };

        var created = await tasks.CreateAsync(task);
        Assert.True(created.Id > 0);

        var fetched = await tasks.GetByIdAsync(created.Id, user.Id);
        Assert.NotNull(fetched);
        Assert.Equal("Buy milk", fetched!.Title);
    }

    [Fact(DisplayName = "Get task by ID respects user isolation")]
    public async Task TaskRepo_GetById_RespectsUserIsolation()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user1 = await SeedUser(db, "user1@test.com");
        var user2 = await SeedUser(db, "user2@test.com");
        var task = new TodoTask { Title = "Private", UserId = user1.Id, Tags = Array.Empty<string>() };
        await tasks.CreateAsync(task);

        var result = await tasks.GetByIdAsync(task.Id, user2.Id);
        Assert.Null(result);
    }

    [Fact(DisplayName = "Delete task sets IsDeleted flag (soft delete)")]
    public async Task TaskRepo_Delete_SoftDeletes()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        var task = new TodoTask { Title = "Delete me", UserId = user.Id, Tags = Array.Empty<string>() };
        await tasks.CreateAsync(task);

        await tasks.DeleteAsync(task);

        // Soft-deleted — still in DB with IsDeleted=true
        var raw = await db.Tasks.IgnoreQueryFilters().FirstAsync(t => t.Id == task.Id);
        Assert.True(raw.IsDeleted);
    }

    // ── Task Repository: Filtering & Pagination ──

    [Fact(DisplayName = "Get tasks filters by priority and paginates")]
    public async Task TaskRepo_GetTasks_FiltersAndPaginates()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        for (int i = 0; i < 5; i++)
            await tasks.CreateAsync(new TodoTask
            {
                Title = $"Task {i}",
                UserId = user.Id,
                Tags = Array.Empty<string>(),
                Priority = i < 2 ? TaskPriority.High : TaskPriority.Low
            });

        var (items, total) = await tasks.GetTasksAsync(
            user.Id, null, null, TaskPriority.High, "createdAt", "desc", 1, 10);

        Assert.Equal(2, total);
        Assert.Equal(2, items.Count());
    }

    [Fact(DisplayName = "Get tasks filters by search keyword in title")]
    public async Task TaskRepo_GetTasks_SearchFilter()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await tasks.CreateAsync(new TodoTask { Title = "Buy groceries", UserId = user.Id, Tags = Array.Empty<string>() });
        await tasks.CreateAsync(new TodoTask { Title = "Read book", UserId = user.Id, Tags = Array.Empty<string>() });

        var (items, _) = await tasks.GetTasksAsync(user.Id, "groceries", null, null, "createdAt", "desc", 1, 10);
        Assert.Single(items);
        Assert.Equal("Buy groceries", items.First().Title);
    }

    [Fact(DisplayName = "Delete all tasks by user ID removes everything")]
    public async Task TaskRepo_DeleteAllByUserId_RemovesAllTasks()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await tasks.CreateAsync(new TodoTask { Title = "T1", UserId = user.Id, Tags = Array.Empty<string>() });
        await tasks.CreateAsync(new TodoTask { Title = "T2", UserId = user.Id, Tags = Array.Empty<string>() });

        await tasks.DeleteAllByUserIdAsync(user.Id);

        Assert.Empty(await db.Tasks.IgnoreQueryFilters().Where(t => t.UserId == user.Id).ToListAsync());
    }

    // ── List Repository: CRUD ──

    [Fact(DisplayName = "Create and list user's lists")]
    public async Task ListRepo_CreateAndGetLists()
    {
        var (db, _, lists, _, _, _) = CreateRepos();
        var user = await SeedUser(db);

        await lists.CreateAsync(new TaskList { Name = "Work", UserId = user.Id, SortOrder = 0 });
        await lists.CreateAsync(new TaskList { Name = "Personal", UserId = user.Id, SortOrder = 1 });

        var result = (await lists.GetListsAsync(user.Id)).ToList();
        Assert.Equal(2, result.Count);
        Assert.Equal("Work", result[0].List.Name);
    }

    [Fact(DisplayName = "Get list by ID includes task count")]
    public async Task ListRepo_GetById_ReturnsTaskCount()
    {
        var (db, tasks, lists, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        var list = new TaskList { Name = "Work", UserId = user.Id, SortOrder = 0 };
        await lists.CreateAsync(list);

        await tasks.CreateAsync(new TodoTask { Title = "T1", UserId = user.Id, ListId = list.Id, Tags = Array.Empty<string>() });

        var (fetched, count) = await lists.GetByIdAsync(list.Id, user.Id);
        Assert.NotNull(fetched);
        Assert.Equal(1, count);
    }

    [Fact(DisplayName = "Delete list moves orphaned tasks to inbox")]
    public async Task ListRepo_Delete_MovesTasksToInbox()
    {
        var (db, tasks, lists, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        var list = new TaskList { Name = "Delete me", UserId = user.Id, SortOrder = 0 };
        await lists.CreateAsync(list);
        var task = new TodoTask { Title = "Orphaned", UserId = user.Id, ListId = list.Id, Tags = Array.Empty<string>() };
        await tasks.CreateAsync(task);

        await lists.DeleteAsync(list, user.Id);

        var updatedTask = await db.Tasks.FirstAsync(t => t.Id == task.Id);
        Assert.Null(updatedTask.ListId);
        Assert.Empty(await db.TaskLists.Where(l => l.UserId == user.Id).ToListAsync());
    }

    // ── User Repository ──

    [Fact(DisplayName = "Create user and retrieve by email")]
    public async Task UserRepo_CreateAndGetByEmail()
    {
        var (db, _, _, users, _, _) = CreateRepos();
        var user = new User { Email = "hello@world.com", DisplayName = "Hello" };
        await users.CreateAsync(user);

        var fetched = await users.GetByEmailAsync("hello@world.com");
        Assert.NotNull(fetched);
        Assert.Equal("Hello", fetched!.DisplayName);
    }

    [Fact(DisplayName = "Get stale demo users filters by age and email pattern")]
    public async Task UserRepo_GetStaleDemoUsers_FiltersCorrectly()
    {
        var (db, _, _, users, _, _) = CreateRepos();
        var stale = new User { Email = "demo-abc@functionflow.local", DisplayName = "Demo" };
        db.Users.Add(stale);
        await db.SaveChangesAsync();
        stale.CreatedAt = DateTime.UtcNow.AddHours(-3);
        await db.SaveChangesAsync();

        var recent = new User { Email = "demo-xyz@functionflow.local", DisplayName = "Demo" };
        db.Users.Add(recent);
        await db.SaveChangesAsync();

        var real = new User { Email = "real@test.com", DisplayName = "Real" };
        db.Users.Add(real);
        await db.SaveChangesAsync();
        real.CreatedAt = DateTime.UtcNow.AddHours(-3);
        await db.SaveChangesAsync();

        var result = (await users.GetStaleDemoUsersAsync(TimeSpan.FromHours(2))).ToList();
        Assert.Single(result);
        Assert.Equal("demo-abc@functionflow.local", result[0].Email);
    }

    // ── AuthCode Repository ──

    [Fact(DisplayName = "Get valid code finds unused, non-expired code")]
    public async Task AuthCodeRepo_GetValidCode_FindsUnused()
    {
        var (db, _, _, _, authCodes, _) = CreateRepos();
        await authCodes.CreateAsync(new AuthCode
        {
            Email = "test@test.com",
            Code = "123456",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        });

        var found = await authCodes.GetValidCodeAsync("test@test.com", "123456");
        Assert.NotNull(found);
    }

    [Fact(DisplayName = "Get valid code ignores already-used codes")]
    public async Task AuthCodeRepo_GetValidCode_IgnoresUsed()
    {
        var (db, _, _, _, authCodes, _) = CreateRepos();
        await authCodes.CreateAsync(new AuthCode
        {
            Email = "test@test.com",
            Code = "123456",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            IsUsed = true
        });

        var found = await authCodes.GetValidCodeAsync("test@test.com", "123456");
        Assert.Null(found);
    }

    [Fact(DisplayName = "Get valid code ignores expired codes")]
    public async Task AuthCodeRepo_GetValidCode_IgnoresExpired()
    {
        var (db, _, _, _, authCodes, _) = CreateRepos();
        await authCodes.CreateAsync(new AuthCode
        {
            Email = "test@test.com",
            Code = "123456",
            ExpiresAt = DateTime.UtcNow.AddMinutes(-1)
        });

        var found = await authCodes.GetValidCodeAsync("test@test.com", "123456");
        Assert.Null(found);
    }

    // ── ApiKey Repository ──

    [Fact(DisplayName = "Get API key by hash finds active key")]
    public async Task ApiKeyRepo_GetByHash_FindsActiveKey()
    {
        var (db, _, _, _, _, apiKeys) = CreateRepos();
        var user = await SeedUser(db);
        await apiKeys.CreateAsync(new ApiKey
        {
            Name = "My Key",
            KeyHash = "abc123",
            KeyPrefix = "ff_abc",
            UserId = user.Id
        });

        var found = await apiKeys.GetByHashAsync("abc123");
        Assert.NotNull(found);
        Assert.Equal("My Key", found!.Name);
    }

    [Fact(DisplayName = "Get API key by hash ignores revoked keys")]
    public async Task ApiKeyRepo_GetByHash_IgnoresRevoked()
    {
        var (db, _, _, _, _, apiKeys) = CreateRepos();
        var user = await SeedUser(db);
        await apiKeys.CreateAsync(new ApiKey
        {
            Name = "Revoked Key",
            KeyHash = "revoked",
            KeyPrefix = "ff_rev",
            UserId = user.Id,
            IsRevoked = true
        });

        var found = await apiKeys.GetByHashAsync("revoked");
        Assert.Null(found);
    }

    [Fact(DisplayName = "Delete all API keys by user ID")]
    public async Task ApiKeyRepo_DeleteByUserId_RemovesAll()
    {
        var (db, _, _, _, _, apiKeys) = CreateRepos();
        var user = await SeedUser(db);
        await apiKeys.CreateAsync(new ApiKey { Name = "K1", KeyHash = "h1", KeyPrefix = "ff_1", UserId = user.Id });
        await apiKeys.CreateAsync(new ApiKey { Name = "K2", KeyHash = "h2", KeyPrefix = "ff_2", UserId = user.Id });

        await apiKeys.DeleteByUserIdAsync(user.Id);
        Assert.Empty(await db.ApiKeys.Where(k => k.UserId == user.Id).ToListAsync());
    }

    // ── Task Repository: Sorting ──

    private static async Task SeedSortTasks(AppDbContext db, EfTaskRepository tasks, int userId)
    {
        await tasks.CreateAsync(new TodoTask
        {
            Title = "Alpha",
            Description = "First task description",
            Notes = "Some notes",
            Url = "https://example.com",
            Priority = TaskPriority.Low,
            Status = Models.TaskStatus.Todo,
            DueDate = DateTime.UtcNow.AddDays(3),
            UserId = userId,
            Tags = new[] { "tag1" }
        });
        await tasks.CreateAsync(new TodoTask
        {
            Title = "Beta",
            Priority = TaskPriority.High,
            Status = Models.TaskStatus.InProgress,
            DueDate = DateTime.UtcNow.AddDays(1),
            UserId = userId,
            Tags = new[] { "tag2" }
        });
        await tasks.CreateAsync(new TodoTask
        {
            Title = "Gamma",
            Description = "Gamma description",
            Priority = TaskPriority.Medium,
            Status = Models.TaskStatus.Done,
            DueDate = DateTime.UtcNow.AddDays(2),
            UserId = userId,
            Tags = Array.Empty<string>()
        });
    }

    [Fact(DisplayName = "Sort by title ascending: Alpha < Beta < Gamma")]
    public async Task TaskRepo_SortByTitleAsc()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await SeedSortTasks(db, tasks, user.Id);

        var (items, _) = await tasks.GetTasksAsync(user.Id, null, null, null, "title", "asc", 1, 10);
        var list = items.ToList();
        Assert.Equal("Alpha", list[0].Title);
        Assert.Equal("Beta", list[1].Title);
        Assert.Equal("Gamma", list[2].Title);
    }

    [Fact(DisplayName = "Sort by title descending: Gamma first")]
    public async Task TaskRepo_SortByTitleDesc()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await SeedSortTasks(db, tasks, user.Id);

        var (items, _) = await tasks.GetTasksAsync(user.Id, null, null, null, "title", "desc", 1, 10);
        var list = items.ToList();
        Assert.Equal("Gamma", list[0].Title);
    }

    [Fact(DisplayName = "Sort by due date ascending: earliest first")]
    public async Task TaskRepo_SortByDueDateAsc()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await SeedSortTasks(db, tasks, user.Id);

        var (items, _) = await tasks.GetTasksAsync(user.Id, null, null, null, "duedate", "asc", 1, 10);
        var list = items.ToList();
        Assert.Equal("Beta", list[0].Title);
    }

    [Fact(DisplayName = "Sort by due date descending: latest first")]
    public async Task TaskRepo_SortByDueDateDesc()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await SeedSortTasks(db, tasks, user.Id);

        var (items, _) = await tasks.GetTasksAsync(user.Id, null, null, null, "duedate", "desc", 1, 10);
        var list = items.ToList();
        Assert.Equal("Alpha", list[0].Title);
    }

    [Fact(DisplayName = "Sort by priority ascending: Low first")]
    public async Task TaskRepo_SortByPriorityAsc()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await SeedSortTasks(db, tasks, user.Id);

        var (items, _) = await tasks.GetTasksAsync(user.Id, null, null, null, "priority", "asc", 1, 10);
        var list = items.ToList();
        Assert.Equal(TaskPriority.Low, list[0].Priority);
    }

    [Fact(DisplayName = "Sort by priority descending: High first")]
    public async Task TaskRepo_SortByPriorityDesc()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await SeedSortTasks(db, tasks, user.Id);

        var (items, _) = await tasks.GetTasksAsync(user.Id, null, null, null, "priority", "desc", 1, 10);
        var list = items.ToList();
        Assert.Equal(TaskPriority.High, list[0].Priority);
    }

    [Fact(DisplayName = "Sort by status ascending: Todo first")]
    public async Task TaskRepo_SortByStatusAsc()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await SeedSortTasks(db, tasks, user.Id);

        var (items, _) = await tasks.GetTasksAsync(user.Id, null, null, null, "status", "asc", 1, 10);
        var list = items.ToList();
        Assert.Equal(Models.TaskStatus.Todo, list[0].Status);
    }

    [Fact(DisplayName = "Sort by status descending: Done first")]
    public async Task TaskRepo_SortByStatusDesc()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await SeedSortTasks(db, tasks, user.Id);

        var (items, _) = await tasks.GetTasksAsync(user.Id, null, null, null, "status", "desc", 1, 10);
        var list = items.ToList();
        Assert.Equal(Models.TaskStatus.Done, list[0].Status);
    }

    [Fact(DisplayName = "Sort by created date ascending: oldest first")]
    public async Task TaskRepo_SortByCreatedAtAsc()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await SeedSortTasks(db, tasks, user.Id);

        var (items, _) = await tasks.GetTasksAsync(user.Id, null, null, null, "createdat", "asc", 1, 10);
        var list = items.ToList();
        Assert.Equal("Alpha", list[0].Title);
    }

    [Fact(DisplayName = "Unknown sort field falls back to created date descending")]
    public async Task TaskRepo_DefaultSort_CreatedAtDesc()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await SeedSortTasks(db, tasks, user.Id);

        var (items, _) = await tasks.GetTasksAsync(user.Id, null, null, null, "unknown", "desc", 1, 10);
        var list = items.ToList();
        Assert.Equal("Gamma", list[0].Title);
    }

    [Fact(DisplayName = "Search matches task description text")]
    public async Task TaskRepo_SearchByDescription()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await SeedSortTasks(db, tasks, user.Id);

        var (items, _) = await tasks.GetTasksAsync(user.Id, "Gamma description", null, null, "createdAt", "desc", 1, 10);
        Assert.Single(items);
        Assert.Equal("Gamma", items.First().Title);
    }

    [Fact(DisplayName = "Filter tasks by status")]
    public async Task TaskRepo_FilterByStatus()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await SeedSortTasks(db, tasks, user.Id);

        var (items, total) = await tasks.GetTasksAsync(user.Id, null, Models.TaskStatus.Done, null, "createdAt", "desc", 1, 10);
        Assert.Equal(1, total);
        Assert.Equal("Gamma", items.First().Title);
    }

    [Fact(DisplayName = "Update task persists changes")]
    public async Task TaskRepo_UpdateAsync_Persists()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        var task = await tasks.CreateAsync(new TodoTask { Title = "Original", UserId = user.Id, Tags = Array.Empty<string>() });

        task.Title = "Modified";
        await tasks.UpdateAsync(task);

        var fetched = await tasks.GetByIdAsync(task.Id, user.Id);
        Assert.Equal("Modified", fetched!.Title);
    }
}
