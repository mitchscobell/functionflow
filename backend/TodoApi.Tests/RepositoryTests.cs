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

    // ── Task Repository ──

    [Fact]
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

    [Fact]
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

    [Fact]
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

    [Fact]
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

    [Fact]
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

    [Fact]
    public async Task TaskRepo_DeleteAllByUserId_RemovesAllTasks()
    {
        var (db, tasks, _, _, _, _) = CreateRepos();
        var user = await SeedUser(db);
        await tasks.CreateAsync(new TodoTask { Title = "T1", UserId = user.Id, Tags = Array.Empty<string>() });
        await tasks.CreateAsync(new TodoTask { Title = "T2", UserId = user.Id, Tags = Array.Empty<string>() });

        await tasks.DeleteAllByUserIdAsync(user.Id);

        Assert.Empty(await db.Tasks.IgnoreQueryFilters().Where(t => t.UserId == user.Id).ToListAsync());
    }

    // ── List Repository ──

    [Fact]
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

    [Fact]
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

    [Fact]
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

    [Fact]
    public async Task UserRepo_CreateAndGetByEmail()
    {
        var (db, _, _, users, _, _) = CreateRepos();
        var user = new User { Email = "hello@world.com", DisplayName = "Hello" };
        await users.CreateAsync(user);

        var fetched = await users.GetByEmailAsync("hello@world.com");
        Assert.NotNull(fetched);
        Assert.Equal("Hello", fetched!.DisplayName);
    }

    [Fact]
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

    [Fact]
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

    [Fact]
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

    [Fact]
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

    [Fact]
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

    [Fact]
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

    [Fact]
    public async Task ApiKeyRepo_DeleteByUserId_RemovesAll()
    {
        var (db, _, _, _, _, apiKeys) = CreateRepos();
        var user = await SeedUser(db);
        await apiKeys.CreateAsync(new ApiKey { Name = "K1", KeyHash = "h1", KeyPrefix = "ff_1", UserId = user.Id });
        await apiKeys.CreateAsync(new ApiKey { Name = "K2", KeyHash = "h2", KeyPrefix = "ff_2", UserId = user.Id });

        await apiKeys.DeleteByUserIdAsync(user.Id);
        Assert.Empty(await db.ApiKeys.Where(k => k.UserId == user.Id).ToListAsync());
    }
}
