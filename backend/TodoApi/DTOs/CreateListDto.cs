namespace TodoApi.DTOs;

/// <summary>Request body for creating a new task list.</summary>
public record CreateListDto(string Name, string? Emoji, string? Color);
