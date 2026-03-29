using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;

namespace TodoApi.Tests;

public class AppDbContextTests
{
    [Fact]
    public void SyncSaveChanges_SetsTimestamps()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("SyncSave_" + Guid.NewGuid())
            .Options;
        var db = new AppDbContext(options);

        var user = new User { Email = "sync@test.com", DisplayName = "Sync" };
        db.Users.Add(user);
        db.SaveChanges();

        Assert.True(user.Id > 0);
        Assert.True(user.CreatedAt <= DateTime.UtcNow);
    }
}
