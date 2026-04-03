using TodoApi.Models;

namespace TodoApi.Repositories;

/// <summary>Data access contract for <see cref="TodoTask"/> entities.</summary>
public interface ITaskRepository
{
    /// <summary>Returns a paginated, filtered, and sorted list of tasks for a user.</summary>
    Task<(IEnumerable<TodoTask> Items, int TotalCount)> GetTasksAsync(
        int userId, string? search, Models.TaskStatus? status, TaskPriority? priority,
        string sortBy, string sortDir, int page, int pageSize);

    /// <summary>Returns a single task owned by the user, or <c>null</c> if not found.</summary>
    Task<TodoTask?> GetByIdAsync(int id, int userId);

    /// <summary>Persists a new task and returns it with the generated ID.</summary>
    Task<TodoTask> CreateAsync(TodoTask task);

    /// <summary>Saves changes to an already-tracked task entity.</summary>
    Task UpdateAsync(TodoTask task);

    /// <summary>Soft-deletes the task by setting <see cref="TodoTask.IsDeleted"/>.</summary>
    Task DeleteAsync(TodoTask task);

    /// <summary>Hard-deletes all tasks (including soft-deleted) for the given user.</summary>
    Task DeleteAllByUserIdAsync(int userId);
}
