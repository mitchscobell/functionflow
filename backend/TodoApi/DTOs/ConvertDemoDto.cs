namespace TodoApi.DTOs;

/// <summary>Request body to start converting a demo account to a real account.</summary>
public record ConvertDemoDto(string Email, string? DisplayName);
