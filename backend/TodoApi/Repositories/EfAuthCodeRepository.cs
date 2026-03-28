using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;

namespace TodoApi.Repositories;

public class EfAuthCodeRepository : IAuthCodeRepository
{
    private readonly AppDbContext _db;

    public EfAuthCodeRepository(AppDbContext db) => _db = db;

    public async Task<IEnumerable<AuthCode>> GetActiveCodesAsync(string email) =>
        await _db.AuthCodes
            .Where(c => c.Email == email && !c.IsUsed && c.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

    public Task<AuthCode?> GetValidCodeAsync(string email, string code) =>
        _db.AuthCodes
            .Where(c => c.Email == email && c.Code == code && !c.IsUsed && c.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync();

    public async Task CreateAsync(AuthCode authCode)
    {
        _db.AuthCodes.Add(authCode);
        await _db.SaveChangesAsync();
    }

    public Task UpdateAsync(AuthCode authCode) =>
        _db.SaveChangesAsync();

    public async Task DeleteByUserIdAsync(int userId)
    {
        var codes = await _db.AuthCodes.Where(c => c.UserId == userId).ToListAsync();
        _db.AuthCodes.RemoveRange(codes);
        await _db.SaveChangesAsync();
    }
}
