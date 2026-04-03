using TodoApi.Models;

namespace TodoApi.Repositories;

/// <summary>Data access contract for <see cref="ApiKey"/> entities.</summary>
public interface IApiKeyRepository
{
    /// <summary>Returns all API keys belonging to the user, newest first.</summary>
    Task<IEnumerable<ApiKey>> GetByUserIdAsync(int userId);

    /// <summary>Returns a single API key owned by the user, or <c>null</c> if not found.</summary>
    Task<ApiKey?> GetByIdAsync(int id, int userId);

    /// <summary>Looks up a non-revoked key by its SHA-256 hash, including the related <see cref="User"/>.</summary>
    Task<ApiKey?> GetByHashAsync(string keyHash);

    /// <summary>Persists a new API key and returns it with the generated ID.</summary>
    Task<ApiKey> CreateAsync(ApiKey apiKey);

    /// <summary>Saves changes to an already-tracked API key entity.</summary>
    Task UpdateAsync(ApiKey apiKey);

    /// <summary>Deletes all API keys associated with the given user.</summary>
    Task DeleteByUserIdAsync(int userId);
}
