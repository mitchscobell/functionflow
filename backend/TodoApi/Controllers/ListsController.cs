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
/// Manages task lists. Each user can create multiple lists to organize tasks
/// by project, context, or category.
/// </summary>
[ApiController]
[Route("api/lists")]
[Authorize]
public class ListsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IValidator<CreateListDto> _createValidator;
    private readonly IValidator<UpdateListDto> _updateValidator;

    private static readonly string[] DefaultColors =
    {
        "blue", "violet", "rose", "amber", "emerald", "cyan", "fuchsia", "orange", "lime", "sky"
    };

    public ListsController(
        AppDbContext db,
        IValidator<CreateListDto> createValidator,
        IValidator<UpdateListDto> updateValidator)
    {
        _db = db;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException());

    /// <summary>Returns all lists for the authenticated user.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ListDto>>> GetLists()
    {
        var userId = GetUserId();
        var lists = await _db.TaskLists
            .Where(l => l.UserId == userId)
            .OrderBy(l => l.SortOrder)
            .Select(l => new ListDto(
                l.Id, l.Name, l.Emoji, l.Color, l.SortOrder,
                l.Tasks.Count(t => !t.IsDeleted),
                l.CreatedAt))
            .ToListAsync();

        return Ok(lists);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ListDto>> GetList(int id)
    {
        var userId = GetUserId();
        var list = await _db.TaskLists
            .Where(l => l.Id == id && l.UserId == userId)
            .Select(l => new ListDto(
                l.Id, l.Name, l.Emoji, l.Color, l.SortOrder,
                l.Tasks.Count(t => !t.IsDeleted),
                l.CreatedAt))
            .FirstOrDefaultAsync();

        if (list == null) return NotFound(new { message = "List not found." });
        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<ListDto>> CreateList([FromBody] CreateListDto dto)
    {
        var validation = await _createValidator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var userId = GetUserId();
        var existingCount = await _db.TaskLists.CountAsync(l => l.UserId == userId);

        var list = new TaskList
        {
            Name = dto.Name,
            Emoji = dto.Emoji,
            Color = dto.Color ?? DefaultColors[existingCount % DefaultColors.Length],
            SortOrder = existingCount,
            UserId = userId
        };

        _db.TaskLists.Add(list);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetList), new { id = list.Id },
            new ListDto(list.Id, list.Name, list.Emoji, list.Color, list.SortOrder, 0, list.CreatedAt));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ListDto>> UpdateList(int id, [FromBody] UpdateListDto dto)
    {
        var validation = await _updateValidator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var userId = GetUserId();
        var list = await _db.TaskLists.FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId);
        if (list == null) return NotFound(new { message = "List not found." });

        if (dto.Name != null) list.Name = dto.Name;
        if (dto.Emoji != null) list.Emoji = dto.Emoji;
        if (dto.Color != null) list.Color = dto.Color;
        if (dto.SortOrder.HasValue) list.SortOrder = dto.SortOrder.Value;

        await _db.SaveChangesAsync();

        var taskCount = await _db.Tasks.CountAsync(t => t.ListId == id && t.UserId == userId);
        return Ok(new ListDto(list.Id, list.Name, list.Emoji, list.Color, list.SortOrder, taskCount, list.CreatedAt));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteList(int id)
    {
        var userId = GetUserId();
        var list = await _db.TaskLists
            .Include(l => l.Tasks)
            .FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId);
        if (list == null) return NotFound(new { message = "List not found." });

        // Move tasks to inbox (unassigned) rather than deleting them
        foreach (var task in list.Tasks)
            task.ListId = null;

        _db.TaskLists.Remove(list);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
