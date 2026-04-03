using TodoApi.Models;

namespace TodoApi.Repositories;

/// <summary>Data access contract for <see cref="TaskList"/> entities.</summary>
public interface IListRepository
{
    /// <summary>Returns all lists for a user, each paired with its active task count.</summary>
    Task<IEnumerable<(TaskList List, int TaskCount)>> GetListsAsync(int userId);

    /// <summary>Returns a single list with its task count, or <c>(null, 0)</c> if not found.</summary>
    Task<(TaskList? List, int TaskCount)> GetByIdAsync(int id, int userId);

    /// <summary>Returns the total number of lists owned by the user.</summary>
    Task<int> GetCountAsync(int userId);

    /// <summary>Persists a new list and returns it with the generated ID.</summary>
    Task<TaskList> CreateAsync(TaskList list);

    /// <summary>Saves changes to an already-tracked list entity.</summary>
    Task UpdateAsync(TaskList list);

    /// <summary>Removes the list and un-assigns its tasks (sets ListId to null).</summary>
    Task DeleteAsync(TaskList list, int userId);

    /// <summary>Hard-deletes all lists owned by the user.</summary>
    Task DeleteAllByUserIdAsync(int userId);

    /// <summary>Returns the number of active (non-deleted) tasks in the specified list.</summary>
    Task<int> GetTaskCountAsync(int listId, int userId);
}
