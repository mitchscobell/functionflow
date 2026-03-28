using TodoApi.Models;

namespace TodoApi.DTOs;

/// <summary>Request body for partially updating an existing task.</summary>
public record UpdateTaskDto(
    string? Title,
    string? Description,
    string? Notes,
    string? Url,
    DateTime? DueDate,
    TaskPriority? Priority,
    Models.TaskStatus? Status,
    string[]? Tags,
    int? ListId
);
