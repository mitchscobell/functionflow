using System.Security.Cryptography;
using System.Text;

namespace TodoApi.Models;

/// <summary>
/// A personal API key that allows a user to access the REST API
/// without going through the email-code authentication flow.
/// The raw key is shown once on creation, then only a prefix is stored.
/// </summary>
public class ApiKey
{
    public int Id { get; set; }

    /// <summary>Friendly label so the user can identify the key.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>First 8 characters of the key, displayed as a hint.</summary>
    public string KeyPrefix { get; set; } = string.Empty;

    /// <summary>SHA-256 hash of the full key (used for lookup).</summary>
    public string KeyHash { get; set; } = string.Empty;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Null means the key never expires.</summary>
    public DateTime? ExpiresAt { get; set; }

    public bool IsRevoked { get; set; }

    /// <summary>
    /// Generates a new cryptographically random API key and sets <see cref="KeyPrefix"/>
    /// and <see cref="KeyHash"/>. Returns the raw key (show to user once).
    /// </summary>
    public static (string rawKey, string prefix, string hash) Generate()
    {
        var bytes = RandomNumberGenerator.GetBytes(ValidationConstants.ApiKeyRandomBytes);
        var raw = ValidationConstants.ApiKeyPrefix + Convert.ToBase64String(bytes).Replace("+", "").Replace("/", "").Replace("=", "");
        var prefix = raw[..ValidationConstants.ApiKeyPrefixLength];
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();
        return (raw, prefix, hash);
    }
}
