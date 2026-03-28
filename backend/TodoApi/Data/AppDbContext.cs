using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TodoApi.Models;

namespace TodoApi.Data;

/// <summary>
/// Entity Framework Core database context for the FunctionFlow application.
/// Configures entity mappings, indexes, query filters, and auto-timestamps.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<TodoTask> Tasks => Set<TodoTask>();
    public DbSet<TaskList> TaskLists => Set<TaskList>();
    public DbSet<AuthCode> AuthCodes => Set<AuthCode>();
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).HasMaxLength(256);
            entity.Property(u => u.DisplayName).HasMaxLength(100);
        });

        modelBuilder.Entity<TodoTask>(entity =>
        {
            entity.HasQueryFilter(t => !t.IsDeleted);
            entity.HasIndex(t => t.UserId);
            entity.HasIndex(t => t.ListId);
            entity.Property(t => t.Title).HasMaxLength(200);
            entity.Property(t => t.Description).HasMaxLength(2000);
            entity.Property(t => t.Notes).HasMaxLength(10000);
            entity.Property(t => t.Url).HasMaxLength(2048);
            entity.Property(t => t.Priority).HasConversion<string>();
            entity.Property(t => t.Status).HasConversion<string>();

            // Store tags as JSON array
            entity.Property(t => t.Tags).HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<string[]>(v, (JsonSerializerOptions?)null) ?? Array.Empty<string>()
            );
        });

        modelBuilder.Entity<TaskList>(entity =>
        {
            entity.HasIndex(l => l.UserId);
            entity.Property(l => l.Name).HasMaxLength(100);
            entity.Property(l => l.Emoji).HasMaxLength(8);
            entity.Property(l => l.Color).HasMaxLength(30);
        });

        modelBuilder.Entity<AuthCode>(entity =>
        {
            entity.HasIndex(a => new { a.Email, a.Code });
        });

        modelBuilder.Entity<ApiKey>(entity =>
        {
            entity.HasIndex(a => a.KeyHash).IsUnique();
            entity.HasIndex(a => a.UserId);
            entity.Property(a => a.Name).HasMaxLength(100);
            entity.Property(a => a.KeyPrefix).HasMaxLength(20);
            entity.Property(a => a.KeyHash).HasMaxLength(64);
        });
    }

    public override int SaveChanges()
    {
        SetTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SetTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void SetTimestamps()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Entity is TodoTask task)
            {
                task.UpdatedAt = DateTime.UtcNow;
                if (entry.State == EntityState.Added)
                    task.CreatedAt = DateTime.UtcNow;
            }
            else if (entry.Entity is User user)
            {
                user.UpdatedAt = DateTime.UtcNow;
                if (entry.State == EntityState.Added)
                    user.CreatedAt = DateTime.UtcNow;
            }
        }
    }
}
