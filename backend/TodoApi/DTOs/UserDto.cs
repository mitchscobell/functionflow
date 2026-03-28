namespace TodoApi.DTOs;

/// <summary>Public representation of a user account.</summary>
public record UserDto(int Id, string Email, string DisplayName, string ThemePreference);
