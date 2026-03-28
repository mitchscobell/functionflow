namespace TodoApi.DTOs;

/// <summary>Public representation of a task list returned by the API.</summary>
public record ListDto(int Id, string Name, string? Emoji, string Color, int SortOrder, int TaskCount, DateTime CreatedAt);
