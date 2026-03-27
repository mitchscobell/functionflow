namespace TodoApi.Models;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;

    // TODO, make this an enum or separate table if we add more themes
    public string ThemePreference { get; set; } = "function"; // function, dark, light
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<TodoTask> Tasks { get; set; } = new List<TodoTask>();
    public ICollection<AuthCode> AuthCodes { get; set; } = new List<AuthCode>();
}
