namespace TodoApi;

/// <summary>
/// Shared validation constants referenced by Create and Update validators.
/// Centralizes magic numbers so they only need to be changed in one place.
/// </summary>
public static class ValidationConstants
{
    /// <summary>Maximum length of a task title.</summary>
    public const int TitleMaxLength = 200;

    /// <summary>Maximum length of a task description.</summary>
    public const int DescriptionMaxLength = 2000;

    /// <summary>Maximum length of task notes.</summary>
    public const int NotesMaxLength = 10000;

    /// <summary>Maximum length of a task URL.</summary>
    public const int UrlMaxLength = 2048;

    /// <summary>Maximum number of tags per task.</summary>
    public const int MaxTags = 10;

    /// <summary>Maximum length of a list name.</summary>
    public const int ListNameMaxLength = 100;

    /// <summary>Maximum length of a list emoji.</summary>
    public const int EmojiMaxLength = 8;

    /// <summary>Maximum length of a list color.</summary>
    public const int ColorMaxLength = 30;

    /// <summary>Maximum length of a display name.</summary>
    public const int DisplayNameMaxLength = 100;

    /// <summary>Exact length of an authentication verification code.</summary>
    public const int AuthCodeLength = 6;

    // ── Auth / Token ────────────────────────────────────────────

    /// <summary>Minutes before an emailed auth code expires.</summary>
    public const int AuthCodeExpiryMinutes = 10;

    /// <summary>Email domain used by ephemeral demo sessions.</summary>
    public const string DemoEmailDomain = "@functionflow.local";

    /// <summary>Number of characters in a generated demo session ID.</summary>
    public const int DemoSessionIdLength = 8;

    /// <summary>Token lifetime (days) when the user checks "Remember Me".</summary>
    public const int RememberMeExpiryDays = 7;

    /// <summary>Token lifetime (hours) for a regular session.</summary>
    public const int RegularTokenExpiryHours = 4;

    // ── Pagination ──────────────────────────────────────────────

    /// <summary>Default page size when the client does not specify one.</summary>
    public const int DefaultPageSize = 20;

    /// <summary>Maximum page size the client may request.</summary>
    public const int MaxPageSize = 100;

    // ── API Keys ────────────────────────────────────────────────

    /// <summary>Prefix prepended to every generated API key (e.g. "ff_").</summary>
    public const string ApiKeyPrefix = "ff_";

    /// <summary>Number of random bytes used to generate an API key.</summary>
    public const int ApiKeyRandomBytes = 32;

    /// <summary>Length of the short prefix stored for display (e.g. "ff_abc12345").</summary>
    public const int ApiKeyPrefixLength = 11;

    // ── Crypto ──────────────────────────────────────────────────

    /// <summary>Minimum value (inclusive) for a 6-digit code: 10^(AuthCodeLength-1).</summary>
    public const int AuthCodeMin = 100_000;

    /// <summary>Maximum value (exclusive) for a 6-digit code: 10^AuthCodeLength.</summary>
    public const int AuthCodeMax = 1_000_000;
}
