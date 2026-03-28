using TodoApi.Models;

namespace TodoApi.Repositories;

public interface IAuthCodeRepository
{
    Task<IEnumerable<AuthCode>> GetActiveCodesAsync(string email);
    Task<AuthCode?> GetValidCodeAsync(string email, string code);
    Task CreateAsync(AuthCode authCode);
    Task UpdateAsync(AuthCode authCode);
    Task DeleteByUserIdAsync(int userId);
}
