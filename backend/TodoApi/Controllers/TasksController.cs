using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TodoApi.DTOs;
using TodoApi.Models;
using TodoApi.Repositories;

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
    private readonly ITaskRepository _tasks;
    private readonly IValidator<CreateTaskDto> _createValidator;
    private readonly IValidator<UpdateTaskDto> _updateValidator;

    public TasksController(
        ITaskRepository tasks,
        IValidator<CreateTaskDto> createValidator,
        IValidator<UpdateTaskDto> updateValidator)
    {
        _tasks = tasks;
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

        var (tasks, totalCount) = await _tasks.GetTasksAsync(
            userId, search, status, priority, sortBy, sortDir, page, pageSize);

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
        var task = await _tasks.GetByIdAsync(id, userId);
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

        await _tasks.CreateAsync(task);
        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, ToDto(task));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TaskDto>> UpdateTask(int id, [FromBody] UpdateTaskDto dto)
    {
        var validation = await _updateValidator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var userId = GetUserId();
        var task = await _tasks.GetByIdAsync(id, userId);
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

        await _tasks.UpdateAsync(task);
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
        var task = await _tasks.GetByIdAsync(id, userId);
        if (task == null) return NotFound(new { message = "Task not found." });

        await _tasks.DeleteAsync(task);
        return NoContent();
    }

    private static TaskDto ToDto(TodoTask t) => new(
        t.Id, t.Title, t.Description, t.Notes, t.Url, t.DueDate,
        t.Priority, t.Status, t.Tags, t.ListId,
        t.CreatedAt, t.UpdatedAt
    );
}
