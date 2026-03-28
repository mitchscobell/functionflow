namespace TodoApi.DTOs;

/// <summary>Paginated response wrapper for task queries.</summary>
public record TaskListResponseDto(
    IEnumerable<TaskDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);
