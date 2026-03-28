namespace TodoApi.Models;

/// <summary>
/// A named collection of tasks belonging to a <see cref="User"/>.
/// Lists allow grouping tasks by project, context, or category.
/// Each list can have an emoji icon and a color theme.
/// </summary>
public class TaskList
{
    public int Id { get; set; }

    /// <summary>User-chosen name for the list (max 100 chars).</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Single emoji character displayed next to the list name.</summary>
    public string? Emoji { get; set; }

    /// <summary>
    /// Gradient/color theme key for the list background.
    /// Auto-assigned on creation, user-changeable.
    /// </summary>
    public string Color { get; set; } = "blue";

    /// <summary>Display order within the user's sidebar (lower = higher).</summary>
    public int SortOrder { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public ICollection<TodoTask> Tasks { get; set; } = new List<TodoTask>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
