namespace TodoApi.Models;

// TODO document each of the models, properties, and relationships. This will be helpful as the project grows and we add more features. For example, we can explain the purpose of the AuthCode model and how it relates to the User model.
public class AuthCode
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int? UserId { get; set; }
    public User? User { get; set; }
}
