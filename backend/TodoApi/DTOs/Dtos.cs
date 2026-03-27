using TodoApi.Models;

namespace TodoApi.DTOs;

// Auth DTOs
public record RequestCodeDto(string Email);
public record VerifyCodeDto(string Email, string Code);
public record AuthResponseDto(string Token, UserDto User);

// User DTOs
public record UserDto(int Id, string Email, string DisplayName, string ThemePreference);
public record UpdateProfileDto(string? DisplayName, string? ThemePreference);

// Task DTOs
public record CreateTaskDto(
    string Title,
    string? Description,
    DateTime? DueDate,
    TaskPriority Priority,
    string[]? Tags
);

public record UpdateTaskDto(
    string? Title,
    string? Description,
    DateTime? DueDate,
    TaskPriority? Priority,
    Models.TaskStatus? Status,
    string[]? Tags
);

public record TaskDto(
    int Id,
    string Title,
    string? Description,
    DateTime? DueDate,
    TaskPriority Priority,
    Models.TaskStatus Status,
    string[] Tags,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record TaskListResponseDto(
    IEnumerable<TaskDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);
