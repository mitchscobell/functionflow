using TodoApi.Models;

namespace TodoApi.Repositories;

public interface IApiKeyRepository
{
    Task<IEnumerable<ApiKey>> GetByUserIdAsync(int userId);
    Task<ApiKey?> GetByIdAsync(int id, int userId);
    Task<ApiKey?> GetByHashAsync(string keyHash);
    Task<ApiKey> CreateAsync(ApiKey apiKey);
    Task UpdateAsync(ApiKey apiKey);
    Task DeleteByUserIdAsync(int userId);
}
