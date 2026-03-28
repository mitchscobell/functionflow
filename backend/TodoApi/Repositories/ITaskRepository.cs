using TodoApi.Models;

namespace TodoApi.Repositories;

public interface ITaskRepository
{
    Task<(IEnumerable<TodoTask> Items, int TotalCount)> GetTasksAsync(
        int userId, string? search, Models.TaskStatus? status, TaskPriority? priority,
        string sortBy, string sortDir, int page, int pageSize);
    Task<TodoTask?> GetByIdAsync(int id, int userId);
    Task<TodoTask> CreateAsync(TodoTask task);
    Task UpdateAsync(TodoTask task);
    Task DeleteAsync(TodoTask task);
    Task DeleteAllByUserIdAsync(int userId);
}
