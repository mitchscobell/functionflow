namespace TodoApi.DTOs;

/// <summary>Request body for updating the current user's profile settings.</summary>
public record UpdateProfileDto(string? DisplayName, string? ThemePreference);
