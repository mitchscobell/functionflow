using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TodoApi.DTOs;
using TodoApi.Extensions;
using TodoApi.Models;
using TodoApi.Repositories;

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
    private readonly IApiKeyRepository _apiKeys;
    private readonly IValidator<CreateApiKeyDto> _validator;

    public ApiKeysController(IApiKeyRepository apiKeys, IValidator<CreateApiKeyDto> validator)
    {
        _apiKeys = apiKeys;
        _validator = validator;
    }

    /// <summary>List all API keys for the current user (prefix only, never the full key).</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ApiKeyDto>>> GetKeys()
    {
        var userId = User.GetUserId();
        var keys = await _apiKeys.GetByUserIdAsync(userId);
        var dtos = keys.Select(k => new ApiKeyDto(k.Id, k.Name, k.KeyPrefix, k.CreatedAt, k.ExpiresAt, k.IsRevoked));
        return Ok(dtos);
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

        var userId = User.GetUserId();
        var (rawKey, prefix, hash) = ApiKey.Generate();

        var key = new ApiKey
        {
            Name = dto.Name,
            KeyPrefix = prefix,
            KeyHash = hash,
            UserId = userId
        };

        await _apiKeys.CreateAsync(key);
        return CreatedAtAction(nameof(GetKeys), null,
            new ApiKeyCreatedDto(key.Id, key.Name, rawKey, prefix, key.CreatedAt));
    }

    /// <summary>Revoke an API key. It can no longer be used for authentication.</summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> RevokeKey(int id)
    {
        var userId = User.GetUserId();
        var key = await _apiKeys.GetByIdAsync(id, userId);
        if (key == null)
            return NotFound(new { message = "API key not found." });

        key.IsRevoked = true;
        await _apiKeys.UpdateAsync(key);
        return NoContent();
    }
}
