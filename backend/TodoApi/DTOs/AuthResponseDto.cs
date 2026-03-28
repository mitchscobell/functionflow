namespace TodoApi.DTOs;

/// <summary>Response returned after successful authentication, containing a JWT and user info.</summary>
public record AuthResponseDto(string Token, UserDto User);
