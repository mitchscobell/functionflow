namespace TodoApi.Models;

/// <summary>
/// A registered user account. Each user authenticates via email codes
/// and owns zero-or-more <see cref="TaskList"/> instances that contain tasks.
/// </summary>
public class User
{
    public int Id { get; set; }

    /// <summary>Unique email address (normalized to lowercase).</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Friendly name shown in the UI header and profile page.</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Chosen UI color theme, stored as a string for CSS class mapping.</summary>
    public string ThemePreference { get; set; } = "function";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<TaskList> TaskLists { get; set; } = new List<TaskList>();
    public ICollection<TodoTask> Tasks { get; set; } = new List<TodoTask>();
    public ICollection<AuthCode> AuthCodes { get; set; } = new List<AuthCode>();
    public ICollection<ApiKey> ApiKeys { get; set; } = new List<ApiKey>();
}
