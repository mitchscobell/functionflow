using TodoApi.Models;

namespace TodoApi.DTOs;

/// <summary>Public representation of a task returned by the API.</summary>
public record TaskDto(
    int Id,
    string Title,
    string? Description,
    string? Notes,
    string? Url,
    DateTime? DueDate,
    TaskPriority Priority,
    Models.TaskStatus Status,
    string[] Tags,
    int? ListId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
