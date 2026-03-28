namespace TodoApi.Models;

/// <summary>
/// A time-limited, single-use verification code sent to a user's email
/// as part of the passwordless authentication flow.
/// <para>
/// When a user requests a login code (<c>POST /api/auth/request-code</c>),
/// a new <see cref="AuthCode"/> is created with a cryptographically random
/// 6-digit code and a 10-minute expiry. Once the code is verified
/// (<c>POST /api/auth/verify-code</c>) the record is marked <see cref="IsUsed"/>.
/// </para>
/// <para>
/// Relationship: an AuthCode is optionally linked to its <see cref="User"/> after
/// the code is verified (the user may not exist yet at request time).
/// </para>
/// </summary>
public class AuthCode
{
    public int Id { get; set; }

    /// <summary>Email the code was sent to (normalized to lowercase).</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Cryptographically random 6-digit numeric code.</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>When this code becomes invalid (UTC).</summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>Set to <c>true</c> after the code has been successfully verified.</summary>
    public bool IsUsed { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Linked after successful verification; null while the code is pending.</summary>
    public int? UserId { get; set; }
    public User? User { get; set; }
}
