using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;

namespace TodoApi.Repositories;

public class EfListRepository : IListRepository
{
    private readonly AppDbContext _db;

    public EfListRepository(AppDbContext db) => _db = db;

    public async Task<IEnumerable<(TaskList List, int TaskCount)>> GetListsAsync(int userId)
    {
        var lists = await _db.TaskLists
            .Where(l => l.UserId == userId)
            .OrderBy(l => l.SortOrder)
            .Select(l => new { List = l, TaskCount = l.Tasks.Count(t => !t.IsDeleted) })
            .ToListAsync();

        return lists.Select(x => (x.List, x.TaskCount));
    }

    public async Task<(TaskList? List, int TaskCount)> GetByIdAsync(int id, int userId)
    {
        var result = await _db.TaskLists
            .Where(l => l.Id == id && l.UserId == userId)
            .Select(l => new { List = l, TaskCount = l.Tasks.Count(t => !t.IsDeleted) })
            .FirstOrDefaultAsync();

        return result == null ? (null, 0) : (result.List, result.TaskCount);
    }

    public Task<int> GetCountAsync(int userId) =>
        _db.TaskLists.CountAsync(l => l.UserId == userId);

    public async Task<TaskList> CreateAsync(TaskList list)
    {
        _db.TaskLists.Add(list);
        await _db.SaveChangesAsync();
        return list;
    }

    public Task UpdateAsync(TaskList list) =>
        _db.SaveChangesAsync();

    public async Task DeleteAsync(TaskList list, int userId)
    {
        var fullList = await _db.TaskLists
            .Include(l => l.Tasks)
            .FirstOrDefaultAsync(l => l.Id == list.Id && l.UserId == userId);

        if (fullList == null)
            return;

        foreach (var task in fullList.Tasks)
            task.ListId = null;

        _db.TaskLists.Remove(fullList);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAllByUserIdAsync(int userId)
    {
        var lists = await _db.TaskLists.Where(l => l.UserId == userId).ToListAsync();
        _db.TaskLists.RemoveRange(lists);
        await _db.SaveChangesAsync();
    }

    public Task<int> GetTaskCountAsync(int listId, int userId) =>
        _db.Tasks.CountAsync(t => t.ListId == listId && t.UserId == userId);
}
