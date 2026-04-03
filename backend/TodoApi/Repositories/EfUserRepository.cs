using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;

namespace TodoApi.Repositories;

/// <summary>Entity Framework Core implementation of <see cref="IUserRepository"/>.</summary>
public class EfUserRepository : IUserRepository
{
    private readonly AppDbContext _db;

    public EfUserRepository(AppDbContext db) => _db = db;

    /// <inheritdoc />
    public async Task<User?> GetByIdAsync(int id) =>
        await _db.Users.FindAsync(id);

    /// <inheritdoc />
    public Task<User?> GetByEmailAsync(string email) =>
        _db.Users.FirstOrDefaultAsync(u => u.Email == email);

    /// <inheritdoc />
    public async Task<IEnumerable<User>> GetStaleDemoUsersAsync(TimeSpan maxAge)
    {
        var cutoff = DateTime.UtcNow - maxAge;
        return await _db.Users
            .Where(u => u.Email.EndsWith(ValidationConstants.DemoEmailDomain) && u.CreatedAt < cutoff)
            .ToListAsync();
    }

    /// <inheritdoc />
    public async Task<User> CreateAsync(User user)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    /// <inheritdoc />
    public Task UpdateAsync(User user) =>
        _db.SaveChangesAsync();

    /// <inheritdoc />
    public async Task DeleteAsync(User user)
    {
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
    }
}
