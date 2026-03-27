using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.DTOs;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IValidator<UpdateProfileDto> _validator;

    public ProfileController(AppDbContext db, IValidator<UpdateProfileDto> validator)
    {
        _db = db;
        _validator = validator;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException());

    [HttpGet]
    public async Task<ActionResult<UserDto>> GetProfile()
    {
        var user = await _db.Users.FindAsync(GetUserId());
        if (user == null) return NotFound();

        return Ok(new UserDto(user.Id, user.Email, user.DisplayName, user.ThemePreference));
    }

    [HttpPut]
    public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var validation = await _validator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var user = await _db.Users.FindAsync(GetUserId());
        if (user == null) return NotFound();

        if (dto.DisplayName != null) user.DisplayName = dto.DisplayName;
        if (dto.ThemePreference != null) user.ThemePreference = dto.ThemePreference;

        await _db.SaveChangesAsync();
        return Ok(new UserDto(user.Id, user.Email, user.DisplayName, user.ThemePreference));
    }
}
