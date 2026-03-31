using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TodoApi.DTOs;
using TodoApi.Extensions;
using TodoApi.Models;
using TodoApi.Repositories;

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
    private readonly IListRepository _lists;
    private readonly IValidator<CreateListDto> _createValidator;
    private readonly IValidator<UpdateListDto> _updateValidator;

    private static readonly string[] DefaultColors =
    {
        "blue", "violet", "rose", "amber", "emerald", "cyan", "fuchsia", "orange", "lime", "sky"
    };

    public ListsController(
        IListRepository lists,
        IValidator<CreateListDto> createValidator,
        IValidator<UpdateListDto> updateValidator)
    {
        _lists = lists;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    /// <summary>Returns all lists for the authenticated user.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ListDto>>> GetLists()
    {
        var userId = User.GetUserId();
        var results = await _lists.GetListsAsync(userId);
        var dtos = results.Select(r => new ListDto(
            r.List.Id, r.List.Name, r.List.Emoji, r.List.Color, r.List.SortOrder,
            r.TaskCount, r.List.CreatedAt));
        return Ok(dtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ListDto>> GetList(int id)
    {
        var userId = User.GetUserId();
        var (list, taskCount) = await _lists.GetByIdAsync(id, userId);
        if (list == null) return NotFound(new { message = "List not found." });
        return Ok(new ListDto(list.Id, list.Name, list.Emoji, list.Color, list.SortOrder, taskCount, list.CreatedAt));
    }

    [HttpPost]
    public async Task<ActionResult<ListDto>> CreateList([FromBody] CreateListDto dto)
    {
        var validation = await _createValidator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var userId = User.GetUserId();
        var existingCount = await _lists.GetCountAsync(userId);

        var list = new TaskList
        {
            Name = dto.Name.Sanitize()!,
            Emoji = dto.Emoji,
            Color = dto.Color ?? DefaultColors[existingCount % DefaultColors.Length],
            SortOrder = existingCount,
            UserId = userId
        };

        await _lists.CreateAsync(list);
        return CreatedAtAction(nameof(GetList), new { id = list.Id },
            new ListDto(list.Id, list.Name, list.Emoji, list.Color, list.SortOrder, 0, list.CreatedAt));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ListDto>> UpdateList(int id, [FromBody] UpdateListDto dto)
    {
        var validation = await _updateValidator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var userId = User.GetUserId();
        var (list, _) = await _lists.GetByIdAsync(id, userId);
        if (list == null) return NotFound(new { message = "List not found." });

        if (dto.Name != null) list.Name = dto.Name.Sanitize()!;
        if (dto.Emoji != null) list.Emoji = dto.Emoji;
        if (dto.Color != null) list.Color = dto.Color;
        if (dto.SortOrder.HasValue) list.SortOrder = dto.SortOrder.Value;

        await _lists.UpdateAsync(list);
        var taskCount = await _lists.GetTaskCountAsync(id, userId);
        return Ok(new ListDto(list.Id, list.Name, list.Emoji, list.Color, list.SortOrder, taskCount, list.CreatedAt));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteList(int id)
    {
        var userId = User.GetUserId();
        var (list, _) = await _lists.GetByIdAsync(id, userId);
        if (list == null) return NotFound(new { message = "List not found." });

        await _lists.DeleteAsync(list, userId);
        return NoContent();
    }
}
