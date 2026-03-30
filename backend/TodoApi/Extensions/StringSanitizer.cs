using System.Text.RegularExpressions;

namespace TodoApi.Extensions;

/// <summary>
/// Extension methods for sanitizing user-supplied strings.
/// </summary>
public static partial class StringSanitizer
{
    [GeneratedRegex("<[^>]*>", RegexOptions.Compiled)]
    private static partial Regex HtmlTagRegex();

    /// <summary>
    /// Strips HTML tags from the input string to prevent stored XSS.
    /// Returns null when the input is null.
    /// </summary>
    public static string? Sanitize(this string? input)
    {
        if (input is null) return null;
        return HtmlTagRegex().Replace(input, string.Empty).Trim();
    }
}
