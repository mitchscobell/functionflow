using TodoApi.Models;

namespace TodoApi.Repositories;

public interface IListRepository
{
    Task<IEnumerable<(TaskList List, int TaskCount)>> GetListsAsync(int userId);
    Task<(TaskList? List, int TaskCount)> GetByIdAsync(int id, int userId);
    Task<int> GetCountAsync(int userId);
    Task<TaskList> CreateAsync(TaskList list);
    Task UpdateAsync(TaskList list);
    Task DeleteAsync(TaskList list, int userId);
    Task DeleteAllByUserIdAsync(int userId);
    Task<int> GetTaskCountAsync(int listId, int userId);
}
