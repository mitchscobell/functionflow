namespace TodoApi.Models;

/// <summary>
/// A single actionable item that belongs to a <see cref="User"/> and optionally
/// to a <see cref="TaskList"/>. Supports soft-delete via <see cref="IsDeleted"/>.
/// </summary>
public class TodoTask
{
    public int Id { get; set; }

    /// <summary>Short summary of what needs to be done (max 200 chars).</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Longer details about the task (max 2000 chars, optional).</summary>
    public string? Description { get; set; }

    /// <summary>Optional free-form notes (markdown, checklists, etc.).</summary>
    public string? Notes { get; set; }

    /// <summary>Optional related URL (documentation link, ticket, reference).</summary>
    public string? Url { get; set; }

    public DateTime? DueDate { get; set; }
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public TaskStatus Status { get; set; } = TaskStatus.Todo;
    public string[] Tags { get; set; } = Array.Empty<string>();

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Optional parent list. Null means the task lives in the default "Inbox".</summary>
    public int? ListId { get; set; }
    public TaskList? List { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
