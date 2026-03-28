using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.DTOs;
using TodoApi.Models;

namespace TodoApi.Controllers;

/// <summary>
/// CRUD operations for tasks with search, filtering, sorting, and pagination.
/// All endpoints are scoped to the authenticated user.
/// </summary>
[ApiController]
[Route("api/tasks")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IValidator<CreateTaskDto> _createValidator;
    private readonly IValidator<UpdateTaskDto> _updateValidator;

    public TasksController(
        AppDbContext db,
        IValidator<CreateTaskDto> createValidator,
        IValidator<UpdateTaskDto> updateValidator)
    {
        _db = db;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException());

    /// <summary>
    /// List tasks with optional filtering, search, and pagination.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<TaskListResponseDto>> GetTasks(
        [FromQuery] string? search,
        [FromQuery] Models.TaskStatus? status,
        [FromQuery] TaskPriority? priority,
        [FromQuery] string? tag,
        [FromQuery] string sortBy = "createdAt",
        [FromQuery] string sortDir = "desc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        pageSize = Math.Clamp(pageSize, 1, 100);
        page = Math.Max(1, page);

        var query = _db.Tasks.Where(t => t.UserId == userId);

        // Search filter
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(t =>
                t.Title.ToLower().Contains(term) ||
                (t.Description != null && t.Description.ToLower().Contains(term)));
        }

        // Status filter
        if (status.HasValue)
            query = query.Where(t => t.Status == status.Value);

        // Priority filter
        if (priority.HasValue)
            query = query.Where(t => t.Priority == priority.Value);

        // Tag filter — performed in-memory since tags are stored as JSON
        var totalCount = await query.CountAsync();

        // Sorting
        query = (sortBy.ToLower(), sortDir.ToLower()) switch
        {
            ("title", "asc") => query.OrderBy(t => t.Title),
            ("title", _) => query.OrderByDescending(t => t.Title),
            ("duedate", "asc") => query.OrderBy(t => t.DueDate),
            ("duedate", _) => query.OrderByDescending(t => t.DueDate),
            ("priority", "asc") => query.OrderBy(t => t.Priority),
            ("priority", _) => query.OrderByDescending(t => t.Priority),
            ("status", "asc") => query.OrderBy(t => t.Status),
            ("status", _) => query.OrderByDescending(t => t.Status),
            ("createdat", "asc") => query.OrderBy(t => t.CreatedAt),
            _ => query.OrderByDescending(t => t.CreatedAt)
        };

        var tasks = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // In-memory tag filter (tags are stored as serialized JSON)
        var taskDtos = tasks
            .Where(t => string.IsNullOrWhiteSpace(tag) || t.Tags.Any(tg => tg.Equals(tag, StringComparison.OrdinalIgnoreCase)))
            .Select(ToDto);

        return Ok(new TaskListResponseDto(taskDtos, totalCount, page, pageSize));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> GetTask(int id)
    {
        var userId = GetUserId();
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (task == null) return NotFound(new { message = "Task not found." });

        return Ok(ToDto(task));
    }

    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask([FromBody] CreateTaskDto dto)
    {
        var validation = await _createValidator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var userId = GetUserId();
        var task = new TodoTask
        {
            Title = dto.Title,
            Description = dto.Description,
            Notes = dto.Notes,
            Url = dto.Url,
            DueDate = dto.DueDate,
            Priority = dto.Priority,
            Status = Models.TaskStatus.Todo,
            Tags = dto.Tags ?? Array.Empty<string>(),
            ListId = dto.ListId,
            UserId = userId
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, ToDto(task));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TaskDto>> UpdateTask(int id, [FromBody] UpdateTaskDto dto)
    {
        var validation = await _updateValidator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var userId = GetUserId();
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (task == null) return NotFound(new { message = "Task not found." });

        if (dto.Title != null) task.Title = dto.Title;
        if (dto.Description != null) task.Description = dto.Description;
        if (dto.Notes != null) task.Notes = dto.Notes;
        if (dto.Url != null) task.Url = dto.Url;
        if (dto.DueDate.HasValue) task.DueDate = dto.DueDate;
        if (dto.Priority.HasValue) task.Priority = dto.Priority.Value;
        if (dto.Status.HasValue) task.Status = dto.Status.Value;
        if (dto.Tags != null) task.Tags = dto.Tags;
        if (dto.ListId.HasValue) task.ListId = dto.ListId.Value == 0 ? null : dto.ListId.Value;

        await _db.SaveChangesAsync();
        return Ok(ToDto(task));
    }

    /// <summary>
    /// Soft-deletes a task. The record persists in the database
    /// but is excluded from all queries via a global query filter.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var userId = GetUserId();
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (task == null) return NotFound(new { message = "Task not found." });

        task.IsDeleted = true;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static TaskDto ToDto(TodoTask t) => new(
        t.Id, t.Title, t.Description, t.Notes, t.Url, t.DueDate,
        t.Priority, t.Status, t.Tags, t.ListId,
        t.CreatedAt, t.UpdatedAt
    );
}
