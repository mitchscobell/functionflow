using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;

namespace TodoApi.Repositories;

/// <summary>Entity Framework Core implementation of <see cref="IApiKeyRepository"/>.</summary>
public class EfApiKeyRepository : IApiKeyRepository
{
    private readonly AppDbContext _db;

    public EfApiKeyRepository(AppDbContext db) => _db = db;

    /// <inheritdoc />
    public async Task<IEnumerable<ApiKey>> GetByUserIdAsync(int userId) =>
        await _db.ApiKeys
            .Where(k => k.UserId == userId)
            .OrderByDescending(k => k.CreatedAt)
            .ToListAsync();

    /// <inheritdoc />
    public Task<ApiKey?> GetByIdAsync(int id, int userId) =>
        _db.ApiKeys.FirstOrDefaultAsync(k => k.Id == id && k.UserId == userId);

    /// <inheritdoc />
    public Task<ApiKey?> GetByHashAsync(string keyHash) =>
        _db.ApiKeys
            .Include(k => k.User)
            .FirstOrDefaultAsync(k => k.KeyHash == keyHash && !k.IsRevoked);

    /// <inheritdoc />
    public async Task<ApiKey> CreateAsync(ApiKey apiKey)
    {
        _db.ApiKeys.Add(apiKey);
        await _db.SaveChangesAsync();
        return apiKey;
    }

    /// <inheritdoc />
    public Task UpdateAsync(ApiKey apiKey) =>
        _db.SaveChangesAsync();

    /// <inheritdoc />
    public async Task DeleteByUserIdAsync(int userId)
    {
        var keys = await _db.ApiKeys.Where(k => k.UserId == userId).ToListAsync();
        _db.ApiKeys.RemoveRange(keys);
        await _db.SaveChangesAsync();
    }
}
