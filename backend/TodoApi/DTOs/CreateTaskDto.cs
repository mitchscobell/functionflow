using TodoApi.Models;

namespace TodoApi.DTOs;

/// <summary>Request body for creating a new task.</summary>
public record CreateTaskDto(
    string Title,
    string? Description,
    string? Notes,
    string? Url,
    DateTime? DueDate,
    TaskPriority Priority,
    string[]? Tags,
    int? ListId
);
