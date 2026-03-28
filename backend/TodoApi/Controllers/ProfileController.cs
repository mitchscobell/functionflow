using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TodoApi.DTOs;
using TodoApi.Repositories;

namespace TodoApi.Controllers;

/// <summary>
/// Manages the authenticated user's profile, including display name
/// and theme preference.
/// </summary>
[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IValidator<UpdateProfileDto> _validator;

    public ProfileController(IUserRepository users, IValidator<UpdateProfileDto> validator)
    {
        _users = users;
        _validator = validator;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException());

    [HttpGet]
    public async Task<ActionResult<UserDto>> GetProfile()
    {
        var user = await _users.GetByIdAsync(GetUserId());
        if (user == null) return NotFound();

        return Ok(new UserDto(user.Id, user.Email, user.DisplayName, user.ThemePreference));
    }

    [HttpPut]
    public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var validation = await _validator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var user = await _users.GetByIdAsync(GetUserId());
        if (user == null) return NotFound();

        if (dto.DisplayName != null) user.DisplayName = dto.DisplayName;
        if (dto.ThemePreference != null) user.ThemePreference = dto.ThemePreference;

        await _users.UpdateAsync(user);
        return Ok(new UserDto(user.Id, user.Email, user.DisplayName, user.ThemePreference));
    }
}
