using TodoApi.Models;

namespace TodoApi.Repositories;

/// <summary>Data access contract for <see cref="User"/> entities.</summary>
public interface IUserRepository
{
    /// <summary>Returns a user by primary key, or <c>null</c> if not found.</summary>
    Task<User?> GetByIdAsync(int id);

    /// <summary>Returns a user by email address, or <c>null</c> if not found.</summary>
    Task<User?> GetByEmailAsync(string email);

    /// <summary>Returns demo users whose accounts are older than <paramref name="maxAge"/>.</summary>
    Task<IEnumerable<User>> GetStaleDemoUsersAsync(TimeSpan maxAge);

    /// <summary>Persists a new user and returns it with the generated ID.</summary>
    Task<User> CreateAsync(User user);

    /// <summary>Saves changes to an already-tracked user entity.</summary>
    Task UpdateAsync(User user);

    /// <summary>Permanently removes the user from the database.</summary>
    Task DeleteAsync(User user);
}
