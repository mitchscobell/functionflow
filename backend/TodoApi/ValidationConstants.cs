namespace TodoApi;

/// <summary>
/// Shared validation constants referenced by Create and Update validators.
/// Centralises magic numbers so they only need to be changed in one place.
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
}
