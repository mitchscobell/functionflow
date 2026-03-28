using System.Security.Claims;
using System.Security.Cryptography;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.DTOs;
using TodoApi.Models;

namespace TodoApi.Controllers;

/// <summary>
/// Manages personal API keys for programmatic access to the REST API.
/// Keys are shown once on creation and can be regenerated at any time.
/// </summary>
[ApiController]
[Route("api/keys")]
[Authorize]
public class ApiKeysController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IValidator<CreateApiKeyDto> _validator;

    public ApiKeysController(AppDbContext db, IValidator<CreateApiKeyDto> validator)
    {
        _db = db;
        _validator = validator;
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException());

    /// <summary>List all API keys for the current user (prefix only, never the full key).</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ApiKeyDto>>> GetKeys()
    {
        var userId = GetUserId();
        var keys = await _db.ApiKeys
            .Where(k => k.UserId == userId)
            .OrderByDescending(k => k.CreatedAt)
            .Select(k => new ApiKeyDto(k.Id, k.Name, k.KeyPrefix, k.CreatedAt, k.ExpiresAt, k.IsRevoked))
            .ToListAsync();

        return Ok(keys);
    }

    /// <summary>
    /// Create a new API key. The full key is returned ONCE in the response;
    /// only the prefix is stored in the database.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiKeyCreatedDto>> CreateKey([FromBody] CreateApiKeyDto dto)
    {
        var validation = await _validator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var userId = GetUserId();
        var (rawKey, prefix, hash) = ApiKey.Generate();

        var key = new ApiKey
        {
            Name = dto.Name,
            KeyPrefix = prefix,
            KeyHash = hash,
            UserId = userId
        };

        _db.ApiKeys.Add(key);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetKeys), null,
            new ApiKeyCreatedDto(key.Id, key.Name, rawKey, prefix, key.CreatedAt));
    }

    /// <summary>Revoke an API key. It can no longer be used for authentication.</summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> RevokeKey(int id)
    {
        var userId = GetUserId();
        var key = await _db.ApiKeys.FirstOrDefaultAsync(k => k.Id == id && k.UserId == userId);
        if (key == null) return NotFound(new { message = "API key not found." });

        key.IsRevoked = true;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
