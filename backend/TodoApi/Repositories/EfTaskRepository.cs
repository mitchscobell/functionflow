using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;

namespace TodoApi.Repositories;

public class EfTaskRepository : ITaskRepository
{
    private readonly AppDbContext _db;

    public EfTaskRepository(AppDbContext db) => _db = db;

    public async Task<(IEnumerable<TodoTask> Items, int TotalCount)> GetTasksAsync(
        int userId, string? search, Models.TaskStatus? status, TaskPriority? priority,
        string sortBy, string sortDir, int page, int pageSize)
    {
        var query = _db.Tasks.Where(t => t.UserId == userId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(t =>
                t.Title.ToLower().Contains(term) ||
                (t.Description != null && t.Description.ToLower().Contains(term)));
        }

        if (status.HasValue)
            query = query.Where(t => t.Status == status.Value);

        if (priority.HasValue)
            query = query.Where(t => t.Priority == priority.Value);

        var totalCount = await query.CountAsync();

        query = (sortBy.ToLower(), sortDir.ToLower()) switch
        {
            ("title", "asc") => query.OrderBy(t => t.Title),
            ("title", _) => query.OrderByDescending(t => t.Title),
            ("duedate", "asc") => query.OrderBy(t => t.DueDate == null).ThenBy(t => t.DueDate),
            ("duedate", _) => query.OrderBy(t => t.DueDate == null).ThenByDescending(t => t.DueDate),
            ("priority", "asc") => query.OrderBy(t => t.Priority),
            ("priority", _) => query.OrderByDescending(t => t.Priority),
            ("status", "asc") => query.OrderBy(t => t.Status),
            ("status", _) => query.OrderByDescending(t => t.Status),
            ("createdat", "asc") => query.OrderBy(t => t.CreatedAt),
            _ => query.OrderByDescending(t => t.CreatedAt)
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public Task<TodoTask?> GetByIdAsync(int id, int userId) =>
        _db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

    public async Task<TodoTask> CreateAsync(TodoTask task)
    {
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();
        return task;
    }

    public Task UpdateAsync(TodoTask task) =>
        _db.SaveChangesAsync();

    public async Task DeleteAsync(TodoTask task)
    {
        task.IsDeleted = true;
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAllByUserIdAsync(int userId)
    {
        var tasks = await _db.Tasks.IgnoreQueryFilters()
            .Where(t => t.UserId == userId).ToListAsync();
        _db.Tasks.RemoveRange(tasks);
        await _db.SaveChangesAsync();
    }
}
