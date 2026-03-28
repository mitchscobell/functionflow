namespace TodoApi.DTOs;

/// <summary>Request body for partially updating an existing task list.</summary>
public record UpdateListDto(string? Name, string? Emoji, string? Color, int? SortOrder);
