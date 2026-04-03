using TodoApi.Models;

namespace TodoApi.Repositories;

/// <summary>Data access contract for <see cref="AuthCode"/> entities.</summary>
public interface IAuthCodeRepository
{
    /// <summary>Returns all unused, non-expired codes for the given email.</summary>
    Task<IEnumerable<AuthCode>> GetActiveCodesAsync(string email);

    /// <summary>Returns the most recent valid (unused, non-expired) code matching the email and code string, or <c>null</c>.</summary>
    Task<AuthCode?> GetValidCodeAsync(string email, string code);

    /// <summary>Persists a new auth code.</summary>
    Task CreateAsync(AuthCode authCode);

    /// <summary>Saves changes to an already-tracked auth code entity.</summary>
    Task UpdateAsync(AuthCode authCode);

    /// <summary>Deletes all auth codes associated with the given user.</summary>
    Task DeleteByUserIdAsync(int userId);
}
